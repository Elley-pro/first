# Сегментация: платёжные интеграторы, PSP и payment orchestration

> Рабочий документ для аутрича/ICP. Search keys — на английском (рынок англоязычный),
> комментарии — на русском. Названия компаний проверять перед использованием:
> рынок консолидируется (Devcode → Nuvei, WLPayments → IXOPAY, Ixaris → Nium и т.д.).

---

## 1. Короткий ответ

Нет, это **не одно и то же и не просто «разные вертикали»**. В исходном списке
смешаны **три независимые оси**:

| Ось | Что описывает | Пример смешения |
|-----|---------------|-----------------|
| **A. Слой в стеке** | что компания реально владеет: код, лицензия, деньги, контракт с мерчантом | «технический интегратор» и «платежка» — это разные слои, а не разные вертикали |
| **B. Риск-тир мерчанта** | как на портфель смотрит эквайер и card schemes | TravelTech — **high-risk** для эквайера, но **крипто-холодный** |
| **C. Крипто-релевантность** | доля альтернативных рельс в объёме | hosting — маленький объём, но крипто-горячий |

Ключевая ошибка, которую надо снять: **«high-risk» ≠ «крипто-дружественный»**.
Travel — классический high-risk (риск недоставки услуги, банкротства оператора,
Thomas Cook), но крипты там почти нет. Hosting — формально скучный SaaS-биллинг,
но крипта там 5–20% объёма. Это разные оси, и таргетировать их надо по-разному.

---

## 2. Ось A — слой в стеке (6 типов компаний)

| # | Тип | Владеет лицензией? | Трогает деньги? | Модель монетизации | Кто покупает |
|---|-----|--------------------|-----------------|--------------------|--------------|
| L1 | **Payment Gateway** (чистая техника) | нет | нет | за транзакцию, фикс | мерчант, у которого уже есть MID |
| L2 | **PSP / «платежка»** | обычно да (или через партнёра) | **да** | % + фикс со сборов | мерчант без MID |
| L3 | **Payment Orchestration Platform (POP)** | нет (принципиально) | **нет** («no flow of funds») | SaaS / за транзакцию | мерчант с 3+ PSP |
| L4 | **White-label gateway software vendor** | нет | нет | лицензия / setup fee + SaaS | сам PSP, банк, ISO |
| L5 | **Technical integrator / fintech dev shop** | нет | нет | time&materials, fixed bid | и мерчант, и PSP, и банк |
| L6 | **Crypto processor / on-off-ramp** | VASP/MiCA/MSB | **да** | % + spread | мерчант в крипто-горячих вертикалях |

### Тест «отличить за 30 секунд» по сайту

- «We connect you to **300+ payment providers**, we never touch your funds, PCI DSS Level 1 vault» → **L3 orchestration**
- «We are the **merchant of record**» → L2-подвид (MoR: Paddle, FastSpring, Digital River)
- Прайс вида **2.9% + $0.30** на главной → **L2 PSP**
- «**White-label**, deploy under your brand, licensing, one-time setup fee, source code» → **L4**
- Кейсы, «our team», «hourly rate», Clutch-профиль → **L5 интегратор**
- «Accept **BTC/USDT**, settlement in fiat, 0.4–1%» → **L6**

> Практическое следствие: у L3 и L4 **цикл сделки и ЛПР другие**, чем у L2.
> L2 продаёт мерчанту (Head of Payments / CFO), L4 продаёт PSP и банкам (CTO / CPO),
> L3 продаёт мерчанту с уже существующей болью каскадирования.

---

## 3. Ось B — риск-тир

| Тир | Вертикали | Что болит | Кто обслуживает |
|-----|-----------|-----------|-----------------|
| **Low-risk** | ритейл-екоммерс, B2B SaaS, marketplace | auth rate, 3DS/SCA, APM-покрытие | Stripe/Adyen/Checkout + L3 |
| **Mid / «future delivery»** | TravelTech, тикетинг, образование, подписки | rolling reserve, риск недоставки, чарджбеки после отмены | спец-эквайеры + travel-L3 |
| **High-risk** | forex/CFD, iGaming, adult, nutra, hosting/VPN, dating | MCC-ограничения (7995, 6211), отвал PSP, гео-блокировки | high-risk PSP + L3 + L6 |

---

## 4. Ось C — почему крипта популярна или нет

Крипта приходит, когда совпадают ≥2 драйвера:

1. **MCC заблокирован** картами (7995 gambling, 6211 securities/forex)
2. **Чарджбеки** дорогие или friendly fraud системный
3. **Выплаты** (payout) важнее приёма — быстрые, кросс-бордер, в необанковские гео
4. **Аудитория уже крипто-нативная** (трейдеры, гемблеры, приватность)
5. **Регуляторный арбитраж** — оффшорная сущность мерчанта

| Вертикаль | Крипта | Почему |
|-----------|--------|--------|
| E-commerce (физтовары) | ❄️ 0.1–1% | нужен refund/chargeback protection, крипта — галочка, а не драйвер. Исключения: high-ticket электроника, gold/bullion, CBD, nutra |
| TravelTech | ❄️ низкая | боль в **B2B-выплатах поставщикам** и virtual cards, не в приёме. Стейблкоин-B2B появляется, но это ранняя фаза |
| B2B SaaS (mainstream) | ❄️ низкая | корп-закупка, invoice/ACH/SEPA, крипта не проходит финконтроль покупателя |
| **Digital goods / VPN / hosting-adjacent SaaS** | 🔥 средне-высокая | ← **это надо отделять от mainstream SaaS**, иначе сегмент размажется |
| Forex / CFD | 🔥 очень высокая | MCC 6211, оффшор, USDT TRC-20 как де-факто стандарт депозита |
| iGaming / casino / betting | 🔥 очень высокая | MCC 7995, мгновенные выплаты, целые crypto-only casino |
| **Gaming (видеоигры, D2C webshop)** | 🌤 низко-средняя | ← **не путать с gambling**. Боль — local payment methods и обход комиссии сторов. Крипта только в web3-гейминге (через on-ramp) |
| Hosting / VPS / домены | 🔥 высокая | приватность покупателя, нулевая толерантность к чарджбекам, глобальная аудитория |

> Две правки к исходной формулировке:
> 1. **SaaS** нельзя целиком класть в крипто-горячие. Горячий — только digital-goods/
>    hosting-adjacent подсегмент. Mainstream B2B SaaS — крипто-холодный.
> 2. **Gaming ≠ gambling.** Разные ЛПР, разные вендоры (Xsolla vs Praxis), разные конференции.

---

## 5. Итоговая матрица: 8 рабочих сегментов

| ID | Сегмент | Слой (ось A) | Риск | Крипта |
|----|---------|--------------|------|--------|
| **S1** | Orchestration for e-commerce | L3 | low | ❄️ |
| **S2** | TravelTech payments | L2/L3 + virtual cards | mid | ❄️ |
| **S3** | Embedded payments / PayFac-as-a-Service для SaaS | L2/L4 | low | ❄️ |
| **S4** | Forex / CFD payments | L2/L3/L6 | high | 🔥 |
| **S5** | iGaming payments & cashier | L2/L3/L6 | high | 🔥 |
| **S6** | Gaming / digital goods D2C | L2 (MoR) | mid | 🌤 |
| **S7** | Hosting / VPN / домены | L6 + биллинг-модули | mid-high | 🔥 |
| **S8** | White-label gateway vendors & интеграторы | L4/L5 | n/a (продают вендорам) | оба |

---

## 6. Search keys по сегментам

Формат каждого блока:
**SEO/Google seeds** → в Ahrefs Keywords Explorer, потом «кто ранжируется» = список компаний.
**Sales Nav** → boolean для LinkedIn.
**Directories** → готовые списки, дешевле любого скрапа.
**Footprint** → технический след (BuiltWith / GitHub / docs-поддомены).
**Anchors** → скормить в `node src/index.js "<Name>" <domain>` и искать lookalike.

---

### S1 — Orchestration for e-commerce ❄️

**SEO/Google seeds**
```
"payment orchestration platform" | "payment orchestration layer"
"smart routing" payments, "payment cascading", "transaction routing engine"
"authorization rate optimization", "acceptance rate uplift", "decline recovery"
"network tokenization", "PCI compliant vault", "universal payments API"
"multi-acquirer" | "multi-PSP" | "PSP aggregator"
"alternative payment methods" APM integration
"payment failover" "retry logic" "dunning"
```
**Sales Nav (ищем ЛПР у мерчанта, не у вендора)**
```
Title: ("Head of Payments" OR "Director of Payments" OR "VP Payments"
  OR "Payments Product Manager" OR "Payment Operations Manager")
Industry: Retail / Internet / Consumer Goods
Keywords: (Shopify Plus OR "commerce cloud" OR "composable commerce")
```
**Directories / источники**
- MACH Alliance member list
- Shopify Plus / Adobe Commerce / commercetools partner directories
- Merchant Risk Council (MRC) вендор-каталог
- Money20/20 и MPE (Merchant Payments Ecosystem) exhibitor lists

**Footprint**
- BuiltWith по тегам Spreedly / Primer / Gr4vy
- `docs.<domain>` + `/api-reference` с эндпоинтами `/payment-methods`, `/vault`
- GitHub org с SDK: `*-node`, `*-php`, `*-ios` под MIT

**Anchors:** Primer, Gr4vy, Spreedly, IXOPAY, Payrails, BR-DGE, Paydock, Yuno, Juspay, Rebilly

**Negative keywords:** `crypto`, `exchange`, `wallet app`, `remittance`, `payroll`

---

### S2 — TravelTech payments ❄️ (high-risk, но не крипто)

**SEO/Google seeds**
```
"payments for OTA" | "travel payment orchestration" | "airline payment gateway"
"IATA BSP" settlement, "NDC payments", "interline settlement"
"virtual cards for travel" | "B2B travel payments" | "supplier payments travel"
"agency payment platform", "travel merchant account high risk"
"chargeback management travel", "multi-currency FX for airlines"
"rolling reserve" travel merchant
```
**Sales Nav**
```
Title: ("Head of Payments" OR "Payments and Fraud" OR "Treasury Manager"
  OR "Head of Finance Operations")
Industry: Travel Arrangements / Airlines / Hospitality
Keywords: (OTA OR "tour operator" OR DMC OR "bed bank" OR consolidator)
```
**Directories**
- Amadeus / Sabre / Travelport partner directories
- IATA Strategic Partnerships listing
- Phocuswire / Phocuswright vendor index
- ITB Berlin, WTM, Travel Tech Show exhibitor lists

**Footprint**
- сайт мерчанта на Amadeus/Sabre GDS + отдельная `payments` страница
- вакансии «Payments Integration Engineer» + «NDC» / «BSP»

**Anchors:** CellPoint Digital, Outpayce (Amadeus), UATP, Voxel, Nium (ex-Ixaris), WEX/Conferma, Trustly (travel vertical)

**Negative:** `crypto`, `casino`, `forex` — здесь они только зашумят выдачу

---

### S3 — Embedded payments / PayFac-as-a-Service для SaaS ❄️

**SEO/Google seeds**
```
"embedded payments" for software platforms
"payfac as a service" | "payment facilitator as a service" | "PayFac model"
"monetize payments" vertical SaaS
"merchant of record" SaaS, "revenue recovery", "usage-based billing"
"split payments" marketplace, "sub-merchant onboarding", "KYB onboarding API"
```
**Sales Nav**
```
Title: ("VP Product" OR "Head of Payments" OR "Chief Revenue Officer")
Industry: Software Development
Keywords: ("vertical SaaS" OR "practice management" OR "field service"
  OR "restaurant POS" OR "gym management")
```
**Directories:** Infinicept/партнёрские каталоги, ETA (Electronic Transactions Association) member list, Stripe Connect / Adyen for Platforms case-study страницы

**Anchors:** Payrix, Finix, Tilled, Stax Connect, Exact Payments, Infinicept, Paddle, FastSpring

**Negative:** `high risk`, `offshore`, `gambling`

---

### S4 — Forex / CFD 🔥

**SEO/Google seeds**
```
"payment solutions for forex brokers" | "forex payment gateway"
"PSP for brokers" | "broker deposits and withdrawals"
"MCC 6211" high risk merchant account
"MT4 payment plugin" | "MT5 payment integration" | "cTrader payments"
"forex CRM payment integration" | "client cabinet payment gateway"
"crypto deposits for brokers", "USDT TRC20 deposits", "instant withdrawals broker"
"payment cascading forex", "offshore merchant account forex"
```
**Sales Nav**
```
Title: ("Head of Payments" OR "Payment Operations" OR "Head of PSP"
  OR "Chief Risk Officer" OR "Head of Compliance")
Industry: Financial Services / Capital Markets
Keywords: (broker OR CFD OR "prop firm" OR "liquidity provider")
```
**Directories — самое ценное здесь**
- **iFX EXPO** (Dubai/Cyprus/Bangkok) exhibitor + sponsor lists
- **Finance Magnates** каталог вендоров + FMLS exhibitor list
- Forex-awards / FXDailyReport номинации «Best Payment Provider»
- Партнёрские страницы forex-CRM: B2Core, FXBackOffice, Syntellicore, Cloud-CRM
  → там перечислены **все** интегрированные PSP

**Footprint**
- у брокера страница `/deposit-methods` или `/funding` → список PSP прямо там
- prop-firm сегмент (растёт): `/payouts` страница

**Anchors:** Praxis Tech, Corefy, Akurateco, B2BinPay / B2Broker, Payadmit, FYST, Payop, Match2Pay

**Negative:** `retail ecommerce`, `Shopify`, `subscription billing`

---

### S5 — iGaming / casino / betting 🔥

**SEO/Google seeds**
```
"payment orchestration for igaming" | "casino payment gateway"
"cashier solution" igaming | "player deposits and withdrawals"
"MCC 7995" merchant account, "pay n play", "instant withdrawals casino"
"crypto casino payments", "igaming PSP aggregator"
"high risk merchant account gambling", "sportsbook payment provider"
```
**Sales Nav**
```
Title: ("Head of Payments" OR "Payments Manager" OR "Head of Fraud"
  OR "Chief Commercial Officer")
Industry: Gambling & Casinos
Keywords: (sportsbook OR igaming OR "online casino" OR aggregator)
```
**Directories — здесь золото**
- **Интеграционные каталоги платформ**: SoftSwiss, EveryMatrix, BetConstruct,
  Digitain, Slotegrator — у каждой публичная страница «payment providers»
  со списком всех интегрированных PSP. Это готовый лид-лист.
- SBC Summit / iGB Live / ICE / SiGMA exhibitor lists
- AskGamblers + Casino Guru: страницы «payment methods» с фильтром по казино
- SlotCatalog «payment systems» индекс

**Footprint**
- у казино `/banking` или `/payments` страница со списком методов
- логотипы платёжек в футере → OCR/парсинг

**Anchors:** Praxis Tech, PaymentIQ (Worldline), Nuvei, Paysafe, Trustly, MiFinity, Jeton, AstroPay, CoinsPaid

**Negative:** `travel`, `B2B SaaS`, `payroll`

---

### S6 — Gaming / digital goods D2C 🌤

**SEO/Google seeds**
```
"payments for game publishers" | "D2C webshop" game
"player payments" | "in-game top up" | "game store payments"
"local payment methods" gaming, "app store fee alternative"
"merchant of record" games, "web shop for mobile games"
```
**Directories:** GDC / Gamescom B2B exhibitor lists, Pocket Gamer Connects sponsor list, Unity/Unreal Marketplace payment plugins

**Anchors:** Xsolla, Coda Payments / Codashop, Appcharge, Stash, FastSpring, Nuvei Gaming

**Крипта:** только web3-подсегмент → отдельные ключи: `"fiat on-ramp for games"`, `"NFT checkout"`, anchors MoonPay / Transak / Ramp Network

---

### S7 — Hosting / VPS / VPN / домены 🔥

**SEO/Google seeds**
```
"accept crypto for hosting" | "crypto payment gateway for hosting"
"WHMCS payment gateway module" | "Blesta payment gateway" | "HostBill payment module"
"recurring crypto payments" | "crypto subscriptions"
"anonymous VPS bitcoin" | "domain registrar crypto payment"
"cPanel billing integration payment"
```
**Footprint — самый чистый сигнал во всём документе**
- **`marketplace.whmcs.com`** — каталог модулей. Каждый крипто-процессор,
  который целится в хостинг, публикует туда модуль. Прямой список игроков.
- `site:github.com "whmcs" "payment gateway" crypto`
- у хостера страница `/payment-methods` со списком (Bitcoin, USDT, Monero)

**Sales Nav**
```
Title: ("Head of Billing" OR "Founder" OR "CTO")
Industry: IT Services / Web Hosting
Company size: 11–200 (сегмент фрагментирован, крупные крипту не берут)
```
**Directories:** WebHostingTalk вендор-разделы, LowEndTalk/LowEndBox, HostingCon/CloudFest exhibitor list

**Anchors:** NOWPayments, Cryptomus, CoinPayments, Plisio, Confirmo, OpenNode, Blockonomics, Coingate

---

### S8 — White-label vendors и технические интеграторы (L4/L5)

Продают **не мерчанту, а PSP/банку/ISO** — поэтому и ключи, и ЛПР другие.

**SEO/Google seeds — L4 (white-label софт)**
```
"white label payment gateway" | "payment gateway software" licence
"start your own PSP" | "launch your own payment gateway"
"payment platform source code" | "turnkey payment solution"
"ISO / MSP platform", "merchant onboarding software", "payment back office software"
```
**SEO/Google seeds — L5 (интеграторы / dev shops)**
```
"fintech software development company" payments
"payment gateway integration services" | "PSP integration company"
"PCI DSS compliant development" | "ISO 8583 development"
"custom payment gateway development" | "core banking integration"
```
**Directories**
- **Clutch / GoodFirms** → категория «Fintech / Payments», фильтр по гео и рейту
- **Upwork / Toptal** агентские профили с кейсами по PSP
- GitHub: организации с репами `iso8583`, `pci-dss`, `3ds-server`
- Партнёрские страницы PSP: «Certified integration partners»

**Sales Nav**
```
Title: (CTO OR "VP Engineering" OR "Head of Delivery" OR "Business Development Director")
Industry: Information Technology & Services
Keywords: (fintech AND (payments OR acquiring OR "payment gateway"))
```
**Anchors L4:** Akurateco, UniPay (United Thinkers), Payneteasy, IXOPAY (white-label ветка), Corefy (ex-PayCore.io)
**Anchors L5:** DashDevs, Softjourn, SDK.finance, Sigma Software — плюс любой топ Clutch по «payments»

---

## 7. Универсальные фильтры

**Negative keywords для всех крипто-холодных сегментов:**
`crypto, cryptocurrency, blockchain, web3, token, exchange, DeFi, wallet app`

**Negative keywords для всех крипто-горячих:**
`Shopify, WooCommerce, subscription billing, payroll, invoice financing, BNPL`

**Дисквалификаторы (не тратить время):**
- компания без `docs.` / `developer.` поддомена → скорее всего реселлер, а не вендор
- «payment gateway» + нет упоминания PCI DSS → перепродажа
- сайт только на одном языке + нет юр-адреса → однодневка (частая история в S4/S5)

---

## 8. Как прогнать через этот репозиторий

Anchors выше — готовый вход в профайлер:

```bash
# крипто-холодные
node src/index.js "Primer"          primer.io      --out=profiles/s1-primer.txt
node src/index.js "CellPoint Digital" cellpointdigital.com --out=profiles/s2-cellpoint.txt
node src/index.js "Payrix"          payrix.com     --out=profiles/s3-payrix.txt

# крипто-горячие
node src/index.js "Praxis Tech"     praxispay.com  --out=profiles/s45-praxis.txt
node src/index.js "Corefy"          corefy.com     --out=profiles/s4-corefy.txt
node src/index.js "NOWPayments"     nowpayments.io --out=profiles/s7-nowpayments.txt

# L4/L5
node src/index.js "Akurateco"       akurateco.com  --out=profiles/s8-akurateco.txt
```

Дальше: из Phase 3 (top organic + paid keywords) вытащить реальные ключи,
по которым они ранжируются и покупают трафик, и **заменить ими сиды из раздела 6** —
получится сегментация, подтверждённая данными, а не гипотезой.
