"""Makes the three made-up sample files for Analyst on Call. Every row is invented; the patterns are planted
on purpose so the analyst has something real to find. Re-running gives the same files (fixed seed)."""
import csv
import datetime as dt
import hashlib
import pathlib
import random

OUT = pathlib.Path(__file__).resolve().parents[2] / "site" / "static" / "analyst" / "samples"
R = random.Random(20261102)


def h(s):
    return hashlib.sha1(s.encode()).hexdigest()[:10]


def loan_book():
    rows, start = [], dt.date(2025, 1, 1)
    products = [("Personal", .41), ("Car", .27), ("Home", .19), ("Card", .13)]
    channels = [("Branch", .46), ("Digital", .38), ("Partner", .16)]
    ring_phones = [h(f"ring{i}") for i in range(9)]
    ring_rows = set(R.sample(range(5000), 42))
    for i in range(5000):
        product = R.choices([p for p, _ in products], [w for _, w in products])[0]
        channel = R.choices([c for c, _ in channels], [w for _, w in channels])[0]
        employment = "Self-employed" if R.random() < (.55 if product == "Personal" else .3) else "Salaried"
        d = start + dt.timedelta(days=R.randint(0, 454))  # Jan 2025 to Mar 2026, so every loan has 6 months of history
        q = (d.year - 2025) * 4 + (d.month - 1) // 3  # 0 = Q1 2025 ... 4 = Q1 2026
        amount = {"Personal": R.lognormvariate(12.4, .55), "Car": R.lognormvariate(13.3, .35),
                  "Home": R.lognormvariate(14.9, .45), "Card": R.lognormvariate(11.2, .5)}[product]
        amount = int(min(max(amount, 20000), 4500000) // 1000 * 1000)
        income = int(R.lognormvariate(13.2 if employment == "Salaried" else 13.0, .45) // 1000 * 1000)
        if channel == "Partner" and R.random() < .40 or R.random() < .006:
            income = ""
        score = int(min(900, max(500, R.gauss(735 if channel == "Branch" else 715, 55))))
        base = {"Home": .006, "Car": .028, "Personal": .045, "Card": .06}[product]
        if employment == "Self-employed":
            base *= 1.7
        base *= 1 + .08 * q                # newer loans are a little weaker everywhere...
        if channel == "Digital":
            base *= 1 + .35 * q            # ...and much weaker in the digital channel
        base *= 1 + max(0, 760 - score) / 220
        if product == "Home":
            base = .006
        late = R.random() < min(base, .6)
        fpd = late and R.random() < .18
        phone = h(f"p{i}")
        if i in ring_rows:
            phone = R.choice(ring_phones)
            channel, product = "Digital", "Personal"
            fpd = R.random() < .74
            late = late or fpd
        rows.append(dict(loan_id=f"LN{100000 + i}", disbursal_date=d.isoformat(), product=product, channel=channel,
                         employment=employment, amount=amount, income=income, bureau_score=score,
                         first_payment_missed="Yes" if fpd else "No", dpd30_at_6m="Yes" if late else "No",
                         phone_hash=phone))
    rows.sort(key=lambda r: r["disbursal_date"])
    return rows


def card_transactions():
    rows, start = [], dt.datetime(2026, 9, 1)
    mcc = [("Groceries", .26), ("Fuel", .12), ("Restaurants", .14), ("Travel", .07), ("Electronics", .08),
           ("Digital goods", .09), ("Utilities", .1), ("Fashion", .14)]
    cards = [f"C{h(str(i))[:8]}" for i in range(1800)]
    test_cards = R.sample(cards, 60)
    for i in range(10000):
        t = start + dt.timedelta(seconds=R.randint(0, 29 * 86400))
        if R.random() < .82:  # most spending happens in the day
            t = t.replace(hour=R.choice(range(8, 23)))
        cat = R.choices([m for m, _ in mcc], [w for _, w in mcc])[0]
        channel = "Online" if cat == "Digital goods" or R.random() < .3 else R.choice(["Chip", "Contactless", "Contactless"])
        amount = round(R.lognormvariate(7.2, 1.0), 2)
        country = "IN" if R.random() < .95 else R.choice(["AE", "GB", "SG", "US"])
        fraud = R.random() < (.004 if channel != "Online" else .009)
        card = R.choice(cards)
        rows.append(dict(txn_id=f"T{700000 + i}", card_id=card, timestamp=t.strftime("%Y-%m-%d %H:%M:%S"),
                         amount=amount, merchant_category=cat, channel=channel, country=country,
                         is_fraud="1" if fraud else "0"))
    # planted card-testing attack: tiny online payments to digital goods, mostly between 1am and 5am
    for k in range(260):
        t = start + dt.timedelta(days=R.randint(10, 27), hours=R.randint(1, 4), minutes=R.randint(0, 59))
        rows.append(dict(txn_id=f"T{720000 + k}", card_id=R.choice(test_cards), timestamp=t.strftime("%Y-%m-%d %H:%M:%S"),
                         amount=round(R.uniform(1, 99), 2), merchant_category="Digital goods", channel="Online",
                         country=R.choice(["IN", "IN", "AE", "SG"]), is_fraud="1" if R.random() < .85 else "0"))
    rows.sort(key=lambda r: r["timestamp"])
    return rows


def alert_queue():
    rules = [  # name, share of alerts, chance an alert is confirmed fraud, average minutes to handle
        ("New device + high amount", .18, .22, 14), ("Velocity: 5+ payments in 10 min", .14, .18, 9),
        ("Payee added < 24h", .2, .06, 11), ("Round-amount transfer", .17, .012, 8),
        ("Night-time login", .16, .008, 7), ("Mule account inbound", .08, .31, 19),
        ("Geo mismatch", .07, .05, 10)]
    rows, start = [], dt.date(2026, 6, 1)
    for i in range(3000):
        rule = R.choices(rules, [r[1] for r in rules])[0]
        d = start + dt.timedelta(days=R.randint(0, 121))
        confirmed = R.random() < rule[2]
        minutes = max(2, round(R.gauss(rule[3] * (1.4 if confirmed else 1), rule[3] * .35)))
        amount = round(R.lognormvariate(10.2 if confirmed else 9.6, .9))
        rows.append(dict(alert_id=f"A{50000 + i}", created_date=d.isoformat(), rule=rule[0],
                         segment=R.choice(["Retail", "Retail", "Retail", "Business"]), amount=amount,
                         outcome="Confirmed fraud" if confirmed else "False positive", handling_minutes=minutes,
                         analyst=f"Analyst {R.randint(1, 12):02d}"))
    rows.sort(key=lambda r: r["created_date"])
    return rows


def write(name, rows):
    with open(OUT / name, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
        w.writeheader(); w.writerows(rows)
    print(name, len(rows), "rows", (OUT / name).stat().st_size // 1024, "KB")


if __name__ == "__main__":
    OUT.mkdir(parents=True, exist_ok=True)
    write("retail-loan-book.csv", loan_book())
    write("card-transactions.csv", card_transactions())
    write("fraud-alert-queue.csv", alert_queue())
