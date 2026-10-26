# Aniimo Taiwan UID Top-Up API

REST API facade สำหรับตรวจสอบตัวละครด้วย `UID + Server` และสร้าง top-up session ที่ล็อก Region เป็น Taiwan, สกุลเงิน `TWD` และช่องทางชำระเงิน `MyCard` เท่านั้น

> สถานะผลการ Reverse Engineering (ตรวจเมื่อ 2026-10-26): storefront ที่เผยแพร่จริงยังใช้ **Via Login** และไม่พบ public UID-verification endpoint ที่ยืนยันได้ โหมด `mock` จึงเป็นค่าเริ่มต้นสำหรับการรันและทดสอบ ส่วนโหมด `remote` ต้องใส่ URL ของ UID endpoint ที่ได้รับอนุญาตและตรวจสอบแล้ว ห้ามนำ URL ที่คาดเดาไปใช้กับ production

## Quick start

ต้องใช้ Node.js 20 ขึ้นไป

```bash
npm install
copy .env.example .env
npm test
npm start
```

หรือรันด้วย Docker Compose:

```bash
docker compose up -d --build
docker compose ps
```

API จะเปิดที่ `http://localhost:3000` หาก port 3000 ถูกใช้งานอยู่ ให้กำหนด host port ใหม่ เช่น PowerShell:

```powershell
$env:APP_PORT=3001
docker compose up -d --build
```

หยุดระบบด้วย `docker compose down`

## Web UI

เปิด `http://localhost:3000` เพื่อใช้งานหน้า responsive UID Top-Up:

1. กรอก mock UID `10000001` และเลือก `TW1`
2. ตรวจสอบชื่อตัวละคร
3. เลือกแพ็ก TWD
4. สร้าง MyCard top-up session

หน้า UI แสดง `SANDBOX DEMO` ชัดเจนและไม่สร้าง payment หรือหักเงินจริง ไฟล์ frontend อยู่ใน `public/` และถูก serve จาก Express origin เดียวกับ API จึงไม่ต้องตั้งค่า CORS เพิ่ม

ทดสอบด้วย `requests.http` หรือ curl:

```bash
curl -X POST http://localhost:3000/api/v1/aniimo/verify ^
  -H "Content-Type: application/json" ^
  -d "{\"uid\":\"10000001\",\"server\":\"TW1\"}"
```

Mock fixtures:

| UID | Server | Character |
| --- | --- | --- |
| `10000001` | `TW1` | `ArielTester` |
| `10000002` | `TW1` | `Mimo` |

## API specification

### `GET /health`

ตอบสถานะ service, provider ที่กำลังใช้ และค่าคงที่ `TW` / `TWD`

### `POST /api/v1/aniimo/verify`

Request:

```json
{
  "uid": "10000001",
  "server": "TW1"
}
```

Success `200`:

```json
{
  "success": true,
  "data": {
    "uid": "10000001",
    "server": "TW1",
    "characterName": "ArielTester",
    "level": 42,
    "region": "TW",
    "currency": "TWD",
    "verifiedAt": "2026-10-26T08:00:00.000Z"
  }
}
```

### `POST /api/v1/aniimo/sessions`

ตรวจ UID ซ้ำก่อนสร้าง session เพื่อป้องกันการใช้ผล verify เก่า และรับเฉพาะ `paymentMethod: "mycard"`

```json
{
  "uid": "10000001",
  "server": "TW1",
  "productId": "pack.twd.01",
  "paymentMethod": "mycard"
}
```

Success `201` จะคืน `id`, `status: "verified"`, ข้อมูลตัวละคร และ `expiresAt` ค่าเริ่มต้น 15 นาที Session นี้เป็น server-side intent เท่านั้น ยังไม่สร้าง order หรือหักเงินจริง

### `GET /api/v1/aniimo/sessions/:id`

อ่าน session ที่ยังไม่หมดอายุ หากไม่พบหรือหมดอายุจะตอบ `404 SESSION_NOT_FOUND`

### Error contract

```json
{
  "success": false,
  "error": {
    "code": "CHARACTER_NOT_FOUND",
    "message": "UID or server is invalid"
  }
}
```

| HTTP | Code | ความหมาย |
| --- | --- | --- |
| 400 | `VALIDATION_ERROR` | รูปแบบ request ไม่ถูกต้อง/มี field เกิน |
| 404 | `CHARACTER_NOT_FOUND` | UID หรือ server ไม่ตรงกัน |
| 404 | `SESSION_NOT_FOUND` | Session ไม่มีหรือหมดอายุ |
| 429 | `RATE_LIMITED` | เกิน rate limit ของ service นี้ |
| 502 | `UPSTREAM_ERROR`, `UPSTREAM_SCHEMA_ERROR`, `UPSTREAM_UNAVAILABLE` | upstream ผิดพลาดหรือ schema เปลี่ยน |
| 503 | `UPSTREAM_RATE_LIMITED`, `UPSTREAM_CIRCUIT_OPEN` | upstream จำกัดการเรียกหรือ circuit เปิด |
| 504 | `UPSTREAM_TIMEOUT` | upstream timeout |

## Reverse engineering notes

### แหล่งข้อมูลและขอบเขต

ตรวจเฉพาะไฟล์ frontend ที่ browser ดาวน์โหลดได้แบบสาธารณะจาก `https://www.aniimo.com/store/zh-tw/` และ JavaScript bundles ของ storefront/login SDK โดยไม่ทำ payment, ไม่แก้ข้อมูลบัญชี, ไม่ bypass CAPTCHA และไม่บันทึกข้อมูลล็อกอินจากโจทย์ไว้ใน repository

Service origins ที่พบใน production bundle:

| หน้าที่ | Origin |
| --- | --- |
| Storefront | `https://www.aniimo.com/store/zh-tw/` |
| Login API | `https://worldx-office-api.aniimo.com` |
| Account bridge | `https://worldx-store-account.kingsgroupgames.com` |
| Store API | `https://worldx-store-coin.kingsgroupgames.com` |
| Anti-bot SDK host | `devproxy-web.kingsgroupgames.com` |

### Flow ปัจจุบันที่ยืนยันจาก bundle

1. Storefront เริ่มด้วย `POST /api/store/init` และ `server_id: 1` เพื่อโหลด config, products, channels, IP/currency และ user payment information
2. Global login ส่ง OTP ด้วย `POST /api/player/email` payload หลักคือ `email`, `region` และ `rid` เมื่อมี CAPTCHA
3. Login ส่ง `POST /api/player/login` payload `{ login_type: "email", region, code, email, rid? }`
4. Response login ให้ bearer token; login SDK เรียก `GET /api/player/roles` ด้วย headers `Accept: application/json`, `Content-Type: application/json`, `Region: zh-tw`, `Authorization: Bearer <token>` โดยใช้ `credentials: omit` และ `cache: no-store`
5. Refresh role ใช้ `POST /api/player/roles/refresh`; ตั้ง default role ใช้ `PUT /api/player/roles/default` payload `{ targetClusterId, roleId }`
6. เมื่อเลือก role แล้ว storefront สร้าง `openid` จาก role และเรียก account bridge `POST /api/account/store/u` ตามด้วย store init/benefit สำหรับ role นั้น
7. Pricing/order flow ที่พบคือ `POST /api/store/cal_show`, `POST /api/store/cal_final`, `POST /api/preload_order`, `POST /api/preload_click`, `POST /api/place_order` และ `POST /api/order`
8. Payment channel มาจาก response ของ store init; ต้องตรวจ channel id จาก response จริงในแต่ละ session ห้าม hard-code id ของ MyCard จากการเดา

### Headers, cookies, token และ signature

- Login SDK ใช้ bearer token ใน `Authorization`; request ระบุ locale ผ่าน `Region`
- Store client ส่ง JSON และแนบ device/browser metadata กับ request; storefront ใช้ cookies ของเว็บ/CDN และ persistent auth cookies เมื่อ login component เปิด option นี้
- หน้าเว็บโหลด anti-bot SDK (Shumei) และส่ง `rid` เมื่อ challenge สำเร็จ
- ไม่พบ client-side encryption หรือ request-signature algorithm ของ Aniimo ใน flow UID เนื่องจากไม่มี UID flow สาธารณะใน bundle
- `x-client-signature` ใน `RemoteVerificationProvider` เป็น **contract ของ facade นี้เอง** (HMAC-SHA256 ของ `timestamp.body`) และใช้เฉพาะเมื่อระบบ upstream ที่องค์กรจัดหาให้รองรับ ไม่ใช่ signature ที่อ้างว่าเป็นของ Aniimo

### เหตุผลที่ Via Login เปลี่ยนเป็น UID โดยตรงไม่ได้จาก API ที่พบ

`GET /api/player/roles` ต้องมี bearer token จาก login และคืน role ของบัญชีที่ล็อกอินเท่านั้น จึงไม่ใช่ arbitrary UID lookup. Store API ใช้ `openid` ที่ derive จาก role หลัง login ไม่ได้ยืนยันว่า `openid` สามารถสร้างจาก UID ภายนอกได้อย่างปลอดภัย การส่ง UID เข้า endpoint ที่เดาจึงเสี่ยงทั้งผิดระบบและผิดเงื่อนไขการใช้งาน

แนวทาง production ที่ถูกต้องคือให้ Aniimo/ผู้ให้บริการมอบ server-to-server UID verification endpoint และ credential สำหรับ merchant จากนั้นตั้ง `VERIFY_PROVIDER=remote` โดย contract ขั้นต่ำที่ facade คาดหวังคือ:

```http
POST $ANIIMO_UID_VERIFY_URL
Content-Type: application/json
Authorization: Bearer $ANIIMO_UPSTREAM_TOKEN

{"uid":"10000001","server":"TW1","region":"TW"}
```

Response ต้องมี `characterName` (หรือ `character_name`, `roleName`, `role_name`) และอาจมี `level`/`requestId` เมื่อ integration จริงทราบ schema แล้วควรเขียน provider เฉพาะแทน flexible mapper นี้

## Resilience และ edge cases

- **Input abuse:** UID รับตัวเลข 6-20 หลัก, server/product id จำกัด character และ length, ปฏิเสธ unknown fields, JSON จำกัด 16 KB
- **Rate limit:** จำกัดต่อ source IP และคืน `RateLimit-*`/`Retry-After`; production หลาย instance ควรย้าย counter ไป Redis/API gateway
- **Upstream 429/5xx:** retry แบบ exponential backoff + jitter สูงสุดตาม `ANIIMO_MAX_RETRIES`; เคารพ `Retry-After` สูงสุด 60 วินาที
- **Timeout:** abort upstream ตาม `ANIIMO_TIMEOUT_MS`
- **Circuit breaker:** หลัง failure ต่อเนื่อง 5 ครั้ง จะเปิด circuit 30 วินาที (ต่อ process)
- **IP blocking:** อย่าหมุน proxy เพื่อหลบ block; ลด concurrency, cache เฉพาะข้อมูลที่ policy อนุญาต และติดต่อ upstream เพื่อ allowlist merchant IP
- **CAPTCHA:** service นี้ไม่แก้หรือ bypass CAPTCHA; หาก upstream ส่ง challenge ให้คืน error ที่ retry ได้และส่ง flow ไปให้ผู้ใช้ทำบน official UI หรือใช้ merchant API ที่ไม่ต้อง CAPTCHA
- **UID/server ผิด:** map upstream `404/422` เป็น `404 CHARACTER_NOT_FOUND` โดยไม่เปิดเผยรายละเอียดภายใน
- **Schema drift:** หาก response ไม่มีชื่อ character ให้ fail closed ด้วย `502 UPSTREAM_SCHEMA_ERROR`
- **Session replay:** session มี UUID และ TTL; ก่อนสร้าง session จะ verify ใหม่ ใน production ควรเก็บใน Redis พร้อม idempotency key และ bind กับ authenticated caller
- **Secrets/PII:** ไม่ log token, OTP, password, UID response body หรือ raw upstream error; secrets อยู่ใน environment/secret manager เท่านั้น

## Production checklist

1. ได้เอกสารและ authorization สำหรับ UID verification + MyCard merchant flow จากผู้ให้บริการ
2. เขียน integration/contract tests ด้วย sandbox credentials
3. ตรวจ server mapping (`TW1` เป็นตัวอย่าง ไม่ใช่ server id ที่ยืนยันจาก production)
4. ตรวจ product/channel จาก `/api/store/init` และ allowlist เฉพาะ MyCard/TWD ฝั่ง server
5. เพิ่ม Redis สำหรับ distributed rate limit/session/idempotency
6. เพิ่ม structured logging, metrics, tracing และ alert บน 429/5xx/schema errors
7. ใช้ TLS, secret manager, outbound allowlist และไม่ส่ง bearer token กลับ client
8. ทำ payment ด้วย hosted redirect/tokenized flow เท่านั้น ห้ามรับข้อมูลบัตรเข้าระบบนี้

## Project structure

```text
src/
  app.js                    Express routes and error contract
  config.js                 Validated environment config
  providers/
    mock-provider.js        Deterministic local fixture
    remote-provider.js      Timeout/retry/circuit-breaker adapter
  middleware/rate-limit.js  In-process limiter
  session-store.js          Expiring in-memory sessions
test/api.test.js            API integration tests
requests.http               Manual request collection
```

## Security and legal note

โค้ดนี้ทำหน้าที่เป็น defensive integration scaffold ไม่ได้ bypass authentication/CAPTCHA และไม่สร้างธุรกรรมจริง การใช้งานกับ Aniimo/MyCard ต้องได้รับอนุญาตและปฏิบัติตาม ToS, privacy policy, กฎหมายคุ้มครองข้อมูล และข้อกำหนดของผู้ให้บริการชำระเงิน
