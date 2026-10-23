"""Локальный стенд моста: настоящие CRM-маршруты (bridge/app) на временной базе, без Telegram и почты.
Запуск:  python web/dev/crm_dev_app.py 8795   (нужны пакеты: fastapi, uvicorn, pywebpush)
Демо-вход: «Руководитель» — PIN 1234, остальные сотрудники — PIN 1111.
Только для разработки — в продакшен не загружать."""
import asyncio
import os
import sys
import tempfile
import time
from contextlib import asynccontextmanager
from pathlib import Path

HERE = Path(__file__).resolve().parent
DATA = HERE / ".data"
DATA.mkdir(exist_ok=True)
os.environ["DATA_DIR"] = str(DATA)
os.environ["BRIDGE_KEY"] = "demo-key-demo-key-demo-key"
os.environ["CRM_ADMIN_NAME"] = "Руководитель"
os.environ["CRM_ADMIN_PIN"] = "1234"
os.environ["SIPUNI_HOOK_TOKEN"] = "dev-sipuni-hook-0123456789"      # приёмник событий: /api/sipuni/hook/dev-sipuni-hook-0123456789
sys.path.insert(0, str(HERE.parents[1] / "bridge"))

import uvicorn                                           # noqa: E402
from fastapi import Depends, FastAPI, HTTPException      # noqa: E402
from fastapi.middleware.cors import CORSMiddleware      # noqa: E402

from datetime import date, timedelta                                   # noqa: E402

from app import config, crm_auth, crm_db, crm_routes, crm_sched, db, onec, sipuni, sipuni_routes, tg_bot, uploads, ds_orders, ds_reports, ds_routes, ds_auto   # noqa: E402


# --- поддельный Telegram-бот: сообщения складываются в TG_LOG (смотреть на /dev/tg) ---
TG_LOG = []


def fake_1c(url):
    """Поддельная 1С (OData): три поступления — аванс по №431, оплата без номера договора, платёж по несуществующему №999."""
    d = lambda ref, purpose, amount, payer, ago: {"Ref_Key": ref, "Number": "0000-" + ref[-2:], "Date": (date.today() - timedelta(days=ago)).isoformat() + "T10:00:00",
                                                "Posted": True, "DeletionMark": False, "ВидОперации": "ОплатаПокупателя", "СуммаДокумента": amount,
                                                "НазначениеПлатежа": purpose, "Контрагент": {"Description": payer, "ИНН": "7841084227"}}
    return {"value": [d("dev-1c-01", "Оплата по договору № 431/26 от 01.10.2026, аванс 50%", 45000, "ПолярныйЩит", 2),
                      d("dev-1c-02", "Оплата за проектные работы", 130000, "ИП Ядыкин", 1),
                      d("dev-1c-03", "Оплата по договору № 999/26", 12000, "ООО «Спектр»", 1)]}


SIPUNI_LOG = []


def fake_sipuni(method, params, raw=False):
    """Поддельный Sipuni: звонок из CRM записывается в SIPUNI_LOG (смотреть на /dev/sipuni), статистика — один пропущенный,
    запись разговора — короткий беззвучный mp3."""
    SIPUNI_LOG.append({"method": method, **params})
    if method == "statistic/export":
        t = time.strftime("%d.%m.%Y %H:%M:%S", time.localtime(time.time() - 1800))
        return ("Тип;Статус;Время;Схема;Откуда;Куда;Кто ответил;Длительность звонка;Длительность разговора;Время ответа;Оценка;ID записи\n"
                f"Входящий;Не отвечен;{t};Основная;79000000003;74951234567;;0:25;0:00;;;\n").encode("utf-8")
    if method == "statistic/record":
        return SILENT_MP3
    return {"success": True}


SILENT_MP3 = bytes.fromhex("fffb9064" + "00" * 413) * 8


def fake_tg(method, payload):
    TG_LOG.append({"method": method, **payload})
    return {"ok": True}


def seed():
    db.init()
    crm_db.init()
    ds_orders.init()
    ds_reports.init()
    ds_auto.init()
    sipuni.init()
    crm_auth.bootstrap_admin()
    tg_bot._http = fake_tg
    config.TG_BOT_ENABLED = True
    config.ONEC_ODATA_URL, config.ONEC_ODATA_USER = "https://1c.demo/odata/standard.odata", "crm"
    onec._http_get = fake_1c
    config.SIPUNI_USER, config.SIPUNI_SECRET = "000000", "dev-secret"
    sipuni._post = fake_sipuni
    for n in ("Алексей", "Дмитрий", "Максим", "Игорь"):
        if not crm_db.user_by_name(n):
            crm_auth.create_user(n, "1111")
    for n, pos in (("Иван", "design"), ("Мария", "sales"), ("Пётр", "ops"), ("Елена", "acc"), ("Ольга", "designer"), ("Кристина", "designer")):
        if not crm_db.user_by_name(n):
            crm_auth.create_user(n, "1111", "user", pos)
    if not sipuni.ext_map():                                    # внутренние номера Sipuni: руководитель — 200, Мария (продажи) — 201
        crm_db.kv_set(sipuni.EXT_KEY, {str(crm_db.user_by_name("Руководитель")["id"]): "200", str(crm_db.user_by_name("Мария")["id"]): "201"})
    for n, chat in (("Руководитель", 1000), ("Алексей", 1001), ("Дмитрий", 1002)):
        u = crm_db.user_by_name(n)
        if u and not u["tg_chat"]:
            crm_db.user_set_tg(u["id"], chat)
    if not ds_orders.list_orders({"id": 0, "role": "admin", "position": "owner"}):          # демо-данные проектной CRM
        own = crm_db.user_by_name("Руководитель")
        ex = {n: crm_db.user_by_name(n)["id"] for n in ("Ольга", "Кристина", "Иван")}
        cu = {n: ds_orders.customer_upsert(n, r, "Europe/Moscow", cm, [{"fio": f, "pos": p, "phone": ph}]) for n, r, cm, f, p, ph in [
            ("ИП Ядыкин", True, "Правки присылает одним файлом", "Ядыкин Сергей Петрович", "Директор", "+7 900 000-00-01"),
            ("ООО «Спектр»", True, "Документы только на почту", "Орлова Елена Викторовна", "Главный инженер", "+7 900 000-00-03"),
            ("ПолярныйЩит", False, "", "Контакт не указан", "", "")]}
        order = ["Сбор данных", "Готов к проектированию", "В проектировании", "Проверка", "На согласовании", "Сдано"]

        def mk(num, c, obj, due, amt, adv, upto, who=None, urgent=False):
            oid = ds_orders.create_order(own, num, cu[c], obj, due, amt, "advance" if adv else "none", amt / 2 if adv else 0, "2026-10-01")
            if upto == "Ожидает аванс":
                return
            if adv:
                ds_orders.record_payment(own, oid, "advance")
            for s in order[1:order.index(upto) + 1]:
                if s == "В проектировании":
                    ds_orders.assign(own, oid, ex[who or "Ольга"])
                ds_orders.move(own, oid, s)
                if s == "Готов к проектированию" and urgent:
                    ds_orders.set_urgent(own, oid, True)
            if upto in ("В проектировании", "На согласовании"):
                ds_orders.plan(own, oid, 0, (date.today() - timedelta(days=2)).isoformat(), due)
        mk("407", "ИП Ядыкин", "Склады, АБК, СПС.СОУЭ", "2026-10-30", 310000, True, "Готов к проектированию", None, True)
        mk("402", "ООО «Спектр»", "Производственное здание, СПС.СОУЭ", "2026-10-22", 420000, False, "В проектировании", "Ольга")
        mk("380", "ООО «Спектр»", "ЛесныеДали, РазныеСистемы", "2026-10-21", 260000, True, "В проектировании", "Кристина")
        mk("421", "ПолярныйЩит", "ПолярныйЩит, ВПВ — ИП Шубинов", "2026-10-30", 180000, True, "Готов к проектированию")
        mk("415", "ИП Ядыкин", "Торговый павильон, СПС", "2026-11-05", 120000, False, "Готов к проектированию")
        mk("408", "ИП Ядыкин", "Детский центр, СПС.СОУЭ", "2026-10-13", 130000, False, "Сбор данных")
        mk("405", "ООО «Спектр»", "ИП Маггерамов, модернизация", "2026-10-28", 210000, False, "На согласовании", "Кристина")
        mk("431", "ПолярныйЩит", "Новый объект, АУП", "2026-11-20", 90000, True, "Ожидает аванс")
    now = time.time()
    if not db.list_threads():
        for ch, peer, title, text, ago in [("tg", "1", "Сергей Петров", "Хорошо, ждём вас в понедельник", 600), ("mail", "info@school.demo", "Ирина Власова", "Re: Акт обследования — подписан", 7200),
                                           ("max", "3", "Павел Ермаков", "Счёт на испытания получили", 14400), ("tg", "4", "Денис Руднев", "Фото с объекта отправил", 100000)]:
            db.add_message(ch, peer, title, f"seed-{peer}", "in", title, "", text, now - ago)
    if not crm_db.msgs_list("general"):
        a, d, m = (crm_db.user_by_name(n)["id"] for n in ("Алексей", "Дмитрий", "Максим"))
        crm_db.msg_add("general", a, "Коллеги, в понедельник планёрка в 10:00", False)
        crm_db.msg_add("general", d, "Принято, подготовлю отчёт по закупкам", False)
        crm_db.msg_add("general", m, "Пожарная инспекция едет на Школу № 214 завтра в 11:00 — нужны журналы!", True)


@asynccontextmanager
async def lifespan(app):
    seed()
    task = asyncio.create_task(crm_sched.run_loop())
    yield
    task.cancel()


app = FastAPI(lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["GET", "POST"], allow_headers=["X-Api-Key", "X-Session", "Content-Type", "X-File-Name"])
app.include_router(crm_routes.router)
app.include_router(ds_routes.router)
app.include_router(sipuni_routes.router)


from fastapi import Request                                # noqa: E402


@app.get("/dev/tg")
def dev_tg():
    return TG_LOG


@app.get("/dev/sipuni")
def dev_sipuni():
    return SIPUNI_LOG


@app.post("/dev/tg/clear")
def dev_tg_clear():
    TG_LOG.clear()
    return {"ok": True}


@app.post("/dev/tg/press")
async def dev_tg_press(request: Request):
    """Нажатие кнопки в «Telegram»: {chat, data, text}."""
    b = await request.json()
    res = tg_bot.handle_update({"callback_query": {"id": "dev", "data": b["data"], "message": {"chat": {"id": b["chat"]}, "message_id": 1, "text": b.get("text", "")}}})
    return res


# --- минимальные маршруты «Общения» (читает те же таблицы, что боевой мост) ---
@app.get("/api/threads", dependencies=[Depends(crm_auth.api_key)])
def threads():
    return db.list_threads()


@app.get("/api/threads/{tid}/messages", dependencies=[Depends(crm_auth.api_key)])
def messages(tid: str):
    if not db.get_thread(tid):
        raise HTTPException(404, "Переписка не найдена")
    return db.list_messages(tid)


@app.post("/api/threads/{tid}/send", dependencies=[Depends(crm_auth.api_key)])
def send_demo(tid: str, body: dict):
    th = db.get_thread(tid)
    if not th:
        raise HTTPException(404, "Переписка не найдена")
    db.add_message(th["channel"], th["peer"], "", f"out-{time.time()}", "out", "Вы", "", str(body.get("text", "")), time.time(), False)
    return {"ok": True}

@app.post("/api/threads/{tid}/send-file")
def send_file_demo(tid: str, body: dict, user=Depends(crm_auth.current_user)):
    """Как в мосту, но без Telegram/MAX/почты: файл (base64 или номер загрузки) отмечается текстом в переписке."""
    import base64
    th = db.get_thread(tid)
    if not th:
        raise HTTPException(404, "Переписка не найдена")
    if body.get("upload"):
        src, name, _, size = uploads.take(body["upload"], user)
        src.unlink(missing_ok=True)
    else:
        data = base64.b64decode(body.get("data", ""))
        name, size = body.get("filename"), len(data)
    db.add_message(th["channel"], th["peer"], "", f"outf-{time.time()}", "out", "Вы", "", f"[файл {name} {size} байт] " + str(body.get("text", "")), time.time(), False)
    return {"ok": True, "file": True}

@app.post("/api/threads/{tid}/messages/{mid}/edit", dependencies=[Depends(crm_auth.api_key)])
def edit_demo(tid: str, mid: int, body: dict):
    """Как в мосту, но без Telegram/MAX: только своё сообщение, письмо исправить нельзя."""
    m = db.get_message(mid)
    if not m or m["thread_id"] != tid or m.get("hidden"):
        raise HTTPException(404, "Сообщение не найдено")
    if m["direction"] != "out":
        raise HTTPException(403, "Исправить или удалить можно только свои сообщения")
    if m["channel"] == "mail":
        raise HTTPException(400, "Отправленное письмо исправить нельзя — его можно только скрыть в CRM")
    db.message_set_text(mid, str(body.get("text", "")).strip())
    return {"ok": True}


@app.post("/api/threads/{tid}/messages/{mid}/delete", dependencies=[Depends(crm_auth.api_key)])
def delete_demo(tid: str, mid: int):
    m = db.get_message(mid)
    if not m or m["thread_id"] != tid or m.get("hidden"):
        raise HTTPException(404, "Сообщение не найдено")
    if m["direction"] != "out":
        raise HTTPException(403, "Исправить или удалить можно только свои сообщения")
    db.message_hide(mid)
    return {"ok": True, "remote": m["channel"] != "mail"}


@app.post("/api/threads/{tid}/read", dependencies=[Depends(crm_auth.api_key)])
def mark_read(tid: str):
    db.set_unread(tid, 0)
    return {"ok": True}


@app.get("/api/threads/{tid}/avatar", dependencies=[Depends(crm_auth.api_key)])
def avatar(tid: str):
    raise HTTPException(404, "Фото нет")


if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=int(sys.argv[1]) if len(sys.argv) > 1 else 8795, log_level="warning")
