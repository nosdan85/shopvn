# NosMarket - Huong Dan Deploy

## Cau truc Project

\\\
shoptay/
+-- web/          -> Next.js Web App (deploy len Vercel)
+-- bot/          -> Discord Bot (deploy len Render)
+-- DEPLOY.md     -> Huong dan nay
\\\

---

## 1. PUSH CODE LEN GITHUB

### Buoc 1.1: Tao repository tren GitHub

1. Mo [https://github.com/new](https://github.com/new)
2. Dat ten repo: \shoptay\ (hoac ten ban muon)
3. Chon **Private** hoac **Public**
4. **KHONG** tick "Add a README", ".gitignore", "License"
5. Click **Create repository**

### Buoc 1.2: Push code tu local len GitHub

Mo terminal tai folder \C:\Users\shhshs\Documents\shoptay\ va chay:

\\\powershell
# Kiem tra remote hien tai
git remote -v

# Neu chua co remote, them moi (doi URL thanh URL cua ban)
git remote set-url origin https://github.com/<USERNAME>/shoptay.git
# hoac
git remote add origin https://github.com/<USERNAME>/shoptay.git

# Them tat ca files
git add .

# Commit
git commit -m "Initial commit: NosMarket web + Discord bot"

# Push len GitHub (branch main)
git branch -M main
git push -u origin main
\\\

**Xac nhan:** Mo repo tren GitHub va kiem tra cac file da duoc push thanh cong.

---

## 2. DEPLOY WEB LEN VERCEL

### Buoc 2.1: Dang ky / Dang nhap Vercel

1. Mo [https://vercel.com](https://vercel.com)
2. Click **Sign Up** -> Chon **Continue with GitHub**
3. Cap quyen Vercel truy cap GitHub cua ban

### Buoc 2.2: Import project

1. Sau khi dang nhap, click **Add New...** -> **Project**
2. Tim repo \shoptay\ trong danh sach
3. Click **Import**

### Buoc 2.3: Cau hinh deploy

| Setting           | Gia tri                        |
|-------------------|--------------------------------|
| **Framework**     | Next.js (tu dong detect)       |
| **Root Directory**| \web\                        |
| **Build Command** | \
pm run build\ (mac dinh)   |
| **Output Dir**    | \.next\ (mac dinh)           |

**Quan trong:** Click **Edit** o phan **Root Directory** va nhap \web\

### Buoc 2.4: Them Environment Variables (neu can)

Trong phan **Environment Variables**, them cac bien:

\\\
NEXT_PUBLIC_DISCORD_CLIENT_ID=your-discord-client-id
NEXT_PUBLIC_DISCORD_REDIRECT_URI=https://your-app.vercel.app/auth/callback
NEXT_PUBLIC_API_URL=https://your-app.vercel.app/api
\\\

> Hien tai app dung mock data nen ban co the bo qua buoc nay ban dau.

### Buoc 2.5: Deploy

1. Click **Deploy**
2. Cho build hoan tat (~1-2 phut)
3. Vercel se cap URL: \https://shoptay-xxx.vercel.app\
4. Click URL de xem web

### Tu dong deploy

Moi khi ban \git push\ len branch \main\, Vercel se tu dong build va deploy lai.

---

## 3. DEPLOY DISCORD BOT LEN RENDER

### Buoc 3.1: Tao Discord Bot tren Discord Developer Portal

1. Mo [https://discord.com/developers/applications](https://discord.com/developers/applications)
2. Click **New Application** -> Dat ten -> Click **Create**
3. Vao tab **Bot**:
   - Click **Reset Token** -> Copy token (chi hien 1 lan!)
   - Bat **MESSAGE CONTENT INTENT**
   - Bat **SERVER MEMBERS INTENT**
   - Bat **PRESENCE INTENT**
4. Vao tab **OAuth2** -> **URL Generator**:
   - Scopes: \ot\, \pplications.commands\
   - Bot Permissions: \Manage Channels\, \Send Messages\, \Embed Links\, \Attach Files\, \Read Message History\, \Add Reactions\
   - Copy URL va invite bot vao server cua ban

### Buoc 3.2: Dang ky / Dang nhap Render

1. Mo [https://render.com](https://render.com)
2. Click **Get Started** -> Dang ky bang **GitHub**
3. Cap quyen Render truy cap GitHub cua ban

### Buoc 3.3: Tao moi Web Service

1. Vao **Dashboard** -> **New +** -> **Web Service**
2. Tim va chon repo \shoptay\
3. Cau hinh:

| Setting             | Gia tri                             |
|---------------------|-------------------------------------|
| **Name**            | \
osmarket-bot\                   |
| **Root Directory**  | \ot\                             |
| **Runtime**         | **Node**                            |
| **Build Command**   | \
pm install && npm run build\    |
| **Start Command**   | \
pm start\                       |
| **Instance Type**   | **Free** (hoac Starter \/thang)   |

### Buoc 3.4: Them Environment Variables

Trong phan **Environment**, click **Add Environment Variable** va them:

\\\
DISCORD_TOKEN=your-bot-token-from-step-3.1
DISCORD_CLIENT_ID=your-bot-client-id
DISCORD_GUILD_ID=your-server-id
API_BASE_URL=https://your-app.vercel.app/api
OWNER_ROLE_ID=your-owner-role-id
TICKET_CATEGORY_ID=your-ticket-category-id
VOUCH_CHANNEL_ID=your-vouch-channel-id
\\\

### Buoc 3.5: Deploy

1. Click **Create Web Service**
2. Render se tu dong build va start bot
3. Kiem tra log: **Logs** tab -> xac nhan thay \"Bot is online!"\
4. Vao Discord server -> kiem tra bot da online

### Tu dong deploy

Moi khi ban \git push\ len branch \main\, Render se tu dong build va restart bot.

---

## 4. WORKFLOW KHI CAP NHAT CODE

\\\powershell
# 1. Sua code
# 2. Commit
git add .
git commit -m "mo ta thay doi"

# 3. Push -> Vercel va Render tu dong deploy
git push
\\\

---

## 5. TONG KET

| Thanh phan    | Platform | URL / Cach truy cap              |
|---------------|----------|----------------------------------|
| Web Frontend  | Vercel   | https://your-app.vercel.app      |
| Web API       | Vercel   | https://your-app.vercel.app/api  |
| Discord Bot   | Render   | Render Dashboard -> Logs         |

**Luu y:**
- Render Free Plan se sleep sau 15 phut inactivity. Bot se offline. Goi Starter (\/thang) de giu bot online 24/7.
- Vercel Free Plan co limit 100GB bandwidth/thang, du dung cho web nho/vua.
- Luon giu \DISCORD_TOKEN\ bi mat. Khong bao gio push \.env\ len GitHub.

