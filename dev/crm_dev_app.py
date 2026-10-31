"""Локальный стенд моста: настоящие CRM-маршруты (bridge/app) на временной базе, без Telegram и почты.
Запуск:  python web/dev/crm_dev_app.py 8795   (нужны пакеты: fastapi, uvicorn, pywebpush)
Демо-вход: «Руководитель» — PIN 1234, остальные сотрудники — PIN 1111.
Второй аргумент — своя база стенда: python web/dev/crm_dev_app.py 8799 ai → web/dev/.data-ai (иначе общая web/dev/.data).
Только для разработки — в продакшен не загружать."""
import asyncio
import os
import sys
import tempfile
import time
from contextlib import asynccontextmanager
from pathlib import Path

HERE = Path(__file__).resolve().parent
DATA = HERE / (".data-" + sys.argv[2] if len(sys.argv) > 2 else ".data")
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

from app import config, crm_auth, crm_db, crm_routes, crm_sched, db, max_bot, onec, sipuni, sipuni_routes, tg_bot, uploads, ds_orders, ds_reports, ds_routes, ds_auto, ds_ai, ds_ai_ops, ds_visits, ai_yandex   # noqa: E402


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


# --- поддельный MAX-бот: вызовы Bot API складываются в MAXBOT_LOG (смотреть на /dev/maxbot), сообщение заказчика — POST /dev/maxbot/in ---
MAXBOT_LOG = []
MAXBOT_STOPPED = {"9001"}          # кто остановил бота: им бот написать не может (как настоящий MAX — 403 chat.denied)


def fake_maxbot(method, path, query, payload):
    MAXBOT_LOG.append({"method": method, "path": path, **query, **({"payload": payload} if payload else {})})
    if method == "POST" and path == "/messages" and str(query.get("user_id")) in MAXBOT_STOPPED:
        raise max_bot.ApiError(403, "chat.denied", "chat.denied")
    if method == "POST" and path == "/uploads":
        return {"url": "https://fu.example/upload.do"}
    if method == "UPLOAD":
        return {"fileId": 1, "token": f"tok-{len(MAXBOT_LOG)}"}
    if method == "POST" and path == "/messages":
        return {"message": {"timestamp": int(time.time() * 1000), "body": {"mid": f"mid.dev{time.time_ns()}"}}}
    return {"success": True}


# --- поддельный YandexGPT: разбор по ключевым словам и шаблонный черновик (смотреть запросы на /dev/ai) ---
AI_LOG = []


def fake_ai(body):
    import json as _json
    import re as _re
    system, text = body["messages"][0]["text"], body["messages"][1]["text"]
    AI_LOG.append({"model": body["modelUri"], "system": system[:400], "user": text[-400:]})
    usage = {"inputTextTokens": str(len(system + text) // 3), "completionTokens": "120"}
    if "jsonSchema" not in body and "JSON" not in system:
        out = ("Здравствуйте! Спасибо за обращение. Чтобы подготовить предложение, пришлите, пожалуйста, поэтажные планы и "
               "площадь объекта. Срок и стоимость сообщим после изучения — [уточнить].")
        return {"result": {"alternatives": [{"message": {"text": out}, "status": "ALTERNATIVE_STATUS_FINAL"}], "usage": usage}}
    ok = lambda d: {"result": {"alternatives": [{"message": {"text": _json.dumps(d, ensure_ascii=False)}, "status": "ALTERNATIVE_STATUS_FINAL"}], "usage": usage}}   # noqa: E731
    if "рабочем чате" in system:                                # поручение из «Команды»: первый сотрудник из списка, чьё имя есть в тексте
        names = [x[2:].strip() for x in system.split("Сотрудники:", 1)[1].splitlines() if x.startswith("- ")]
        msg = text.rsplit("Сообщение:", 1)[-1].strip()
        who = next((n for n in names if n.split()[0][:-1].lower() in msg.lower()), names[0] if "личный чат" in system and names else "")
        what = _re.sub(r"^[А-ЯЁ][а-яё]+,\s*", "", msg).rstrip(".!")
        return ok({"is_task": bool(who), "assignee": who, "what": what[:1].upper() + what[1:], "due_date": ""})
    if "сводку по заказчику" in system:
        return ok({"summary": "Демо-сводка: заказчик в работе, по задачам есть сроки.", "status": "active", "in_work": [l[2:80] for l in text.splitlines() if l.startswith("- №")][:3],
                   "money": "См. задачи", "last_contact": "", "next_steps": ["Позвонить и уточнить статус исходных данных"], "risks": ["Срок по договору просрочен"] if "просрочено" in text else []})
    last = text.rsplit("---", 1)[-1].lower()
    has = lambda *w: any(x in last for x in w)                  # noqa: E731
    kind = ("spam" if has("реклам", "рассылк") else "docs_payment" if has("оплат", "акт ", "договор") or _re.search(r"(?<![а-я])сч[её]т", last) else "remarks" if has("замечан")
            else "source_data" if has("исходн", "поэтаж", "тз ") else "question" if _re.search(r"№\s?\d{3}", last) else "new_request")
    svc = [n for k, n in (("сигнал", "Проект СПС"), ("спс", "Проект СПС"), ("соуэ", "Проект СОУЭ"), ("оповещ", "Проект СОУЭ"), ("пожаротуш", "Проект АУП"),
                          ("риск", "Расчёт пожарного риска"), ("категор", "Категорирование"), ("надзор", "Авторский надзор"), ("эвакуац", "План эвакуации")) if k in last]
    route = {"new_request": "Мария", "docs_payment": "Пётр", "source_data": "Пётр", "remarks": "Иван"}.get(kind, "")
    inn = _re.search(r"инн\D{0,3}(\d{10}|\d{12})", last)
    org = _re.search(r"((?:ооо|ао|ип)\s+[«\"]?[\w\- ]+[»\"]?)", text, _re.I)
    num = _re.search(r"№\s?(\d{3})", last)
    d = {"kind": kind, "summary": {"new_request": "Запрос на новую работу", "docs_payment": "Вопрос по документам или оплате", "remarks": "Прислал замечания к проекту",
                                   "source_data": "Прислал исходные данные", "question": "Вопрос по текущей задаче", "spam": "Рекламная рассылка"}.get(kind, "Прочее")
         + (": " + ", ".join(dict.fromkeys(svc)) if svc else ""), "urgency": "high" if has("срочн") else "normal",
         "org": org.group(1).strip() if org else "", "inn": inn.group(1) if inn else "", "contact": "", "phone": "", "email": "", "object": "", "city": "",
         "services": list(dict.fromkeys(svc)), "need": "", "deadline": "", "order_number": num.group(1) if num else "",
         "route_to": route, "route_reason": "по правилу для типа «" + kind + "»" if route else "", "route_confident": kind == "new_request",
         "reply_needed": kind != "spam"}
    area = _re.search(r"(\d[\d\s]*)\s?(?:м2|м²|кв)", last)
    floors = _re.search(r"(\d+)\s?этаж", last)
    tone = "claim" if has("претенз", "суд", "расторг") else "unhappy" if has("сколько можно", "до сих пор", "недовол") else "normal"
    d.update(tone=tone, urgency="high" if tone == "claim" else d["urgency"], area=area.group(0) if area else "", floors=floors.group(0) if floors else "",
             fclass="", building="склад" if has("склад") else "", stage="", inputs="поэтажные планы" if has("план") else "",
             questions=[_re.split(r"[.!\n:]", q)[-1].strip() + "?" for q in text.rsplit("---", 1)[-1].split("?")[:-1] if q.strip(" .:;,!")][:5],
             missing=([x for x, k in (("Адрес объекта", "адрес"), ("Площадь", "м2"), ("Этажность", "этаж"), ("Поэтажные планы", "план")) if k not in last]
                      if kind == "new_request" else []),
             next_step={"new_request": "Запросить недостающее и посчитать КП", "docs_payment": "Передать в бухгалтерию", "remarks": "Передать проектировщику",
                        "source_data": "Проверить комплектность исходных", "question": "Ответить по статусу задачи"}.get(kind, ""))
    return {"result": {"alternatives": [{"message": {"text": _json.dumps(d, ensure_ascii=False)}, "status": "ALTERNATIVE_STATUS_FINAL"}], "usage": usage}}


def seed():
    db.init()
    crm_db.init()
    ds_orders.init()
    ds_reports.init()
    ds_auto.init()
    sipuni.init()
    ds_ai.init()
    ds_ai_ops.init()
    ds_visits.init()
    crm_auth.bootstrap_admin()
    ai_yandex._post, ds_ai.PAUSE = fake_ai, 3                    # ИИ: поддельный YandexGPT, разбор через 3 с после сообщения
    if not crm_db.kv_get(ds_ai.SETTINGS_KEY):
        ds_ai.save_settings({"enabled": True, "routing": "Новые заявки — Марии. Счета, оплаты, исходные данные — Петру. Замечания к проекту — Ивану."})
    tg_bot._http = fake_tg
    max_bot._http, max_bot.username = fake_maxbot, "proekty_ds_bot"
    config.TG_BOT_ENABLED = True
    config.ONEC_ODATA_URL, config.ONEC_ODATA_USER = "https://1c.demo/odata/standard.odata", "crm"
    onec._http_get = fake_1c
    config.SIPUNI_USER, config.SIPUNI_SECRET = "000000", "dev-secret"
    sipuni._post = fake_sipuni
    from app import mail_channel
    config.MAIL_ENABLED, mail_channel.send = True, fake_mail_send      # письма — в MAIL_LOG (/dev/mail), никуда не уходят
    for n in ("Алексей", "Дмитрий", "Максим", "Игорь"):
        if not crm_db.user_by_name(n):
            crm_auth.create_user(n, "1111")
    for n, pos in (("Иван", "design"), ("Мария", "sales"), ("Пётр", "ops"), ("Елена", "acc"), ("Ольга", "designer"), ("Кристина", "designer"), ("Нина", "norm")):
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
                ds_orders.plan(own, oid, 0, (date.today() - timedelta(days=2)).isoformat(), max(due, date.today().isoformat()))     # свежая база после срока демо-задач
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
    if not crm_db.kv_get("dev_norm_seed"):          # нормативный специалист Нина: диалоги «Ядыкина» и «Фирмы-Фарпост», переданный диалог, задачи на расчёт
        crm_db.kv_set("dev_norm_seed", 1)
        own, ops, nina = (crm_db.user_by_name(n) for n in ("Руководитель", "Пётр", "Нина"))
        cu = {c["name"]: c["id"] for c in ds_orders.customers_for(own)}
        far = cu.get("ООО «Фирма-Фарпост»") or ds_orders.customer_upsert("ООО «Фирма-Фарпост»", True, "Asia/Vladivostok", "", [{"fio": "Андрей Ким", "pos": "Инженер", "phone": "+7 900 000-00-07"}])
        for peer, title, text, cid in (("5", "Сергей Ядыкин", "Когда будет расчёт пожарного риска по складам?", cu.get("ИП Ядыкин")), ("6", "Андрей Ким", "Направляю поэтажные планы для расчёта", far)):
            db.add_message("tg", peer, title, f"seed-{peer}", "in", title, "", text, now - 1800)
            if cid:
                ds_orders.thread_set_link(own, f"tg:{peer}", cid)
        ds_orders.thread_handoff(ops, "tg:4", nina["id"], "Уточните исходные данные для расчёта")
        o407 = next((o["id"] for o in ds_orders.list_orders(own) if o["number"] == "407"), 0)
        ds_orders.task_create(ops, "Разработка пожарного риска", nina["id"], (date.today() + timedelta(days=4)).isoformat(), order_id=o407, note="Склады, АБК: расчёт по методике МЧС")
        ds_orders.task_create(ops, "Разработка пожарного риска: торговый центр «Восток»", nina["id"], (date.today() + timedelta(days=1)).isoformat())


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
app.include_router(ds_ai.router)
app.include_router(ds_ai_ops.router)
app.include_router(ds_visits.router)


from fastapi import Request                                # noqa: E402


@app.get("/dev/tg")
def dev_tg():
    return TG_LOG


@app.get("/dev/maxbot")
def dev_maxbot():
    return MAXBOT_LOG


@app.post("/dev/maxbot/in")
async def dev_maxbot_in(request: Request):
    """Заказчик пишет боту: {"user_id": 4242, "name": "Иван Петров", "text": "…"} — как событие message_created."""
    b = await request.json()
    uid = int(b.get("user_id") or 4242)
    MAXBOT_STOPPED.discard(str(uid))
    first, _, last = str(b.get("name") or "Иван Петров").partition(" ")
    upd = {"update_type": "message_created", "message": {"sender": {"user_id": uid, "first_name": first, "last_name": last},
           "recipient": {"chat_type": "dialog"}, "timestamp": int(time.time() * 1000), "body": {"mid": f"mid.in{time.time()}", "text": b.get("text", "")}}}
    return {"result": max_bot.handle_update(upd)}


@app.post("/dev/maxbot/start")
async def dev_maxbot_start(request: Request):
    """Заказчик открыл ссылку на бота и нажал «Начать»: {"user_id": 4243, "name": "…", "payload": "DS…"} — событие bot_started."""
    b = await request.json()
    uid = int(b.get("user_id") or 4243)
    MAXBOT_STOPPED.discard(str(uid))
    first, _, last = str(b.get("name") or "Пётр Сидоров").partition(" ")
    upd = {"update_type": "bot_started", "user": {"user_id": uid, "first_name": first, "last_name": last}, "payload": b.get("payload")}
    return {"result": max_bot.handle_update(upd)}


@app.get("/dev/ai")
def dev_ai():
    return AI_LOG


@app.post("/dev/in")
async def dev_in(request: Request):
    """Входящее от заказчика в любой канал: {"channel": "mail", "peer": "x@y.ru", "name": "…", "subject": "…", "text": "…"} — как настоящий приём."""
    b = await request.json()
    ch = b.get("channel") or "mail"
    db.add_message(ch, str(b.get("peer") or "client@demo.ru"), b.get("name") or "Заказчик", f"dev-in-{time.time()}", "in", b.get("name") or "Заказчик",
                   b.get("subject", ""), b.get("text", ""), time.time())
    return {"thread_id": f"{ch}:{b.get('peer') or 'client@demo.ru'}"}


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
@app.get("/api/threads")
def threads(user=Depends(crm_auth.ext_user)):
    ts = db.list_threads()
    only = crm_auth.handoff_only(user)               # как в мосту: руководителю проектного отдела и нормативному специалисту — только свои диалоги
    return [t for t in ts if t["id"] in only] if only is not None else ts


@app.get("/api/threads/{tid}/messages", dependencies=[Depends(crm_auth.ext_thread)])
def messages(tid: str):
    if not db.get_thread(tid):
        raise HTTPException(404, "Переписка не найдена")
    return db.list_messages(tid)


@app.post("/api/threads/{tid}/send", dependencies=[Depends(crm_auth.ext_thread)])
def send_demo(tid: str, body: dict):
    th = db.get_thread(tid)
    if not th:
        raise HTTPException(404, "Переписка не найдена")
    if th["channel"] == "maxbot":                         # MAX-бот — как в мосту, через max_bot (Bot API подменён)
        try:
            max_bot.send_customer(th["peer"], str(body.get("text", "")))
        except max_bot.NotStarted as e:
            raise HTTPException(409, str(e))
        return {"ok": True}
    db.add_message(th["channel"], th["peer"], "", f"out-{time.time()}", "out", "Вы", "", str(body.get("text", "")), time.time(), False)
    return {"ok": True}

# --- поддельная почта: письма не уходят, а складываются в MAIL_LOG (смотреть на /dev/mail); почта и MAX-бот идут через настоящий код моста ---
MAIL_LOG = []


def fake_mail_send(to, text, subject="", in_reply_to="", attachments=None):
    MAIL_LOG.append({"to": to, "subject": subject, "text": text, "in_reply_to": in_reply_to,
                     "attachments": [{"name": n, "mime": m, "size": len(d)} for n, m, d in attachments or []]})
    return f"<dev{len(MAIL_LOG)}.{int(time.time())}@dev>"


@app.get("/dev/mail")
def dev_mail():
    return MAIL_LOG


@app.post("/api/threads/new")
async def new_message_demo(body: dict, user=Depends(crm_auth.ext_user)):
    from app import main
    if body.get("channel") != "mail":
        raise HTTPException(400, "На стенде — только почта (Telegram не подключён)")
    return await main.new_message(main.NewMsgBody(**body), user)


@app.post("/api/threads/{tid}/send-file")
async def send_file_demo(tid: str, body: dict, user=Depends(crm_auth.ext_thread)):
    """Почта и MAX-бот — настоящий код моста (письма и Bot API подменены); остальное — файл отмечается текстом в переписке."""
    import base64
    th = db.get_thread(tid)
    if not th:
        raise HTTPException(404, "Переписка не найдена")
    if th["channel"] in ("mail", "maxbot"):
        from app import main
        return await main.send_file(tid, main.SendFileBody(**body), user)
    if body.get("upload"):
        src, name, _, size = uploads.take(body["upload"], user)
        src.unlink(missing_ok=True)
    else:
        data = base64.b64decode(body.get("data", ""))
        name, size = body.get("filename"), len(data)
    if th["channel"] == "maxbot":
        try:
            max_bot.send_file_customer(th["peer"], str(body.get("text", "")), name, data if not body.get("upload") else b"(dev)", body.get("mime") or "application/pdf")
        except max_bot.NotStarted as e:
            raise HTTPException(409, str(e))
        return {"ok": True, "file": True}
    db.add_message(th["channel"], th["peer"], "", f"outf-{time.time()}", "out", "Вы", "", f"[файл {name} {size} байт] " + str(body.get("text", "")), time.time(), False)
    return {"ok": True, "file": True}

@app.post("/api/threads/{tid}/messages/{mid}/edit", dependencies=[Depends(crm_auth.ext_thread)])
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


@app.post("/api/threads/{tid}/messages/{mid}/delete", dependencies=[Depends(crm_auth.ext_thread)])
def delete_demo(tid: str, mid: int):
    m = db.get_message(mid)
    if not m or m["thread_id"] != tid or m.get("hidden"):
        raise HTTPException(404, "Сообщение не найдено")
    if m["direction"] != "out":
        raise HTTPException(403, "Исправить или удалить можно только свои сообщения")
    db.message_hide(mid)
    return {"ok": True, "remote": m["channel"] != "mail"}


@app.post("/api/threads/{tid}/read", dependencies=[Depends(crm_auth.ext_thread)])
def mark_read(tid: str):
    db.set_unread(tid, 0)
    return {"ok": True}


@app.get("/api/threads/{tid}/avatar", dependencies=[Depends(crm_auth.api_key)])
def avatar(tid: str):
    raise HTTPException(404, "Фото нет")


if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=int(sys.argv[1]) if len(sys.argv) > 1 else 8795, log_level="warning")
