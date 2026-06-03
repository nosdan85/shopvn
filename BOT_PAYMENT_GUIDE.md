# 🤖 BOT THANH TOÁN TỰ ĐỘNG - HƯỚNG DẪN

## 📋 Tổng Quan

Bot Discord tự động xử lý thanh toán và giao hàng cho shop Robux. Khi khách hàng đặt hàng, bot sẽ tự động tạo ticket, giao Robux, và đóng ticket.

---

## 🔄 QUY TRÌNH HOẠT ĐỘNG

### 1️⃣ Khách Đặt Hàng (Website → Backend)

```
Khách hàng → Website (nosroblox.com)
   ↓
Chọn sản phẩm + Điền thông tin Roblox
   ↓
Click "Đặt hàng"
   ↓
Backend tạo Order trong database
   ↓
Status: "cho_xu_ly" (chờ thanh toán)
```

**Thông tin lưu trong Order**:
- `robloxUsername` - Tên Roblox nhận hàng
- `robloxId` - Roblox User ID
- `totalAmount` - Tổng tiền VND
- `items[]` - Danh sách sản phẩm (Robux amount)
- `paymentStatus` - Trạng thái thanh toán
- `status` - Trạng thái đơn hàng

---

### 2️⃣ Khách Thanh Toán

**Option A: Nạp tiền qua SePay (MB Bank)**

```
Khách → Trang "Nạp tiền"
   ↓
Tạo mã nạp: "NAP USERNAME ABC123"
   ↓
Chuyển khoản MB Bank với nội dung: "NAP USERNAME ABC123"
   ↓
SePay webhook → Backend nhận thông báo
   ↓
Backend cộng tiền vào ví (soDuVnd)
   ↓
Khách quay lại → Chọn "Thanh toán bằng ví"
   ↓
Backend trừ tiền từ ví
   ↓
Order.paymentStatus = "da_thanh_toan"
```

**Option B: Nạp thẻ cào**

```
Khách → Trang "Nạp tiền"
   ↓
Chọn nhà mạng + Nhập serial + mã thẻ
   ↓
Backend gọi API gạch thẻ
   ↓
Nếu thành công → Cộng tiền vào ví
   ↓
Thanh toán đơn hàng bằng ví
```

**Option C: PayPal / Crypto (nếu có)**
- Tương tự, sau thanh toán → Update paymentStatus

---

### 3️⃣ Bot Tự Động Tạo Ticket

**Khi nào bot tạo ticket?**

Có 2 cách:

#### Cách 1: Auto (Recommended)
```
Order.paymentStatus = "da_thanh_toan"
   ↓
Backend emit event hoặc queue job
   ↓
Bot worker check database mỗi X phút
   ↓
Tìm orders có: paymentStatus="da_thanh_toan" AND status="cho_xu_ly"
   ↓
Tự động tạo ticket Discord
```

**File**: `api/workers/ticketWorker.js` hoặc scheduled job

#### Cách 2: Manual (Fallback)
```
Admin vào Admin Panel
   ↓
Click "Tạo Ticket" trên đơn hàng
   ↓
Backend gọi bot API
   ↓
Bot tạo ticket Discord
```

**File**: `api/routes/donHangRoutes.js` - `POST /:orderId/tao-ticket`

---

### 4️⃣ Bot Tạo Ticket Discord

**Quá trình tạo ticket**:

```javascript
// 1. Tạo thread/channel mới trong Discord
const channel = await guild.channels.create({
    name: `ticket-${orderId}`,
    type: ChannelType.GuildText,
    parent: TICKET_CATEGORY_ID,
    topic: `Order #${orderId} - ${robloxUsername}`
});

// 2. Gửi thông tin đơn hàng
await channel.send({
    embeds: [{
        title: '🎫 Đơn Hàng Mới',
        fields: [
            { name: 'Mã đơn', value: orderId },
            { name: 'Roblox Username', value: robloxUsername },
            { name: 'Số Robux', value: totalRobux },
            { name: 'Tổng tiền', value: `${totalAmount} VND` },
        ],
        color: 0x2F9BE6
    }]
});

// 3. Gửi nút hành động
await channel.send({
    content: '**Hành động:**',
    components: [{
        type: 1,
        components: [
            {
                type: 2,
                style: 3, // Green
                label: 'Đã Giao',
                custom_id: `delivered_${orderId}`
            },
            {
                type: 2,
                style: 4, // Red
                label: 'Hủy',
                custom_id: `cancel_${orderId}`
            }
        ]
    }]
});

// 4. Update order status
await Order.findByIdAndUpdate(orderId, {
    status: 'da_tao_ticket',
    discordTicketId: channel.id
});
```

**File**: `api/bot/handlers/ticketHandler.js` hoặc `bot/src/handlers/tickets.js`

---

### 5️⃣ Staff Xử Lý (Manual hoặc Auto)

**Option A: Manual (Staff giao tay)**

```
Staff vào Discord ticket
   ↓
Đọc thông tin: robloxUsername, số Robux
   ↓
Login Roblox → Trade/Transfer Robux cho khách
   ↓
Quay lại Discord → Click nút "Đã Giao"
   ↓
Bot update database:
   - Order.status = "hoan_thanh"
   - Order.completedAt = now
   ↓
Bot đóng ticket channel
```

**Bot button handler**:
```javascript
// File: bot/src/interactions/buttons.js
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton()) return;
    
    if (interaction.customId.startsWith('delivered_')) {
        const orderId = interaction.customId.split('_')[1];
        
        // Update order
        await Order.findByIdAndUpdate(orderId, {
            status: 'hoan_thanh',
            completedAt: new Date()
        });
        
        // Close ticket
        await interaction.channel.delete();
        
        await interaction.reply({ 
            content: '✅ Đơn hàng đã hoàn thành!',
            ephemeral: true 
        });
    }
});
```

**Option B: Fully Automatic (Advanced)**

Nếu có API tự động trade Robux (hiếm, rất khó):

```
Bot nhận ticket mới
   ↓
Gọi Roblox API (hoặc bot game)
   ↓
Tự động trade Robux cho robloxUsername
   ↓
Nếu thành công:
   - Update status = "hoan_thanh"
   - Đóng ticket
   - Gửi proof screenshot
```

⚠️ **Lưu ý**: Roblox API không hỗ trợ trade tự động chính thức. Cần dùng:
- Game pass purchase (khách mua, bot verify)
- Private server donate (bot ở trong game)
- Manual trade (an toàn nhất)

---

## 📂 CẤU TRÚC CODE

### Backend Files:

```
api/
├── bot/
│   ├── index.js                    # Bot client export
│   ├── handlers/
│   │   ├── ticketHandler.js        # Tạo/đóng ticket
│   │   └── messageHandler.js       # Xử lý commands
│   └── utils/
│       └── channels.js             # Create channels
│
├── routes/
│   └── donHangRoutes.js            # POST /:orderId/tao-ticket
│
├── workers/
│   └── ticketWorker.js             # Auto check orders → create tickets
│
└── models/
    └── Order.js                    # Order schema
```

### Bot Folder (Standalone):

```
bot/
├── src/
│   ├── index.js                    # Main bot file
│   ├── commands/
│   │   └── ticket.js               # /ticket command
│   ├── interactions/
│   │   └── buttons.js              # Button handlers
│   └── utils/
│       ├── createTicket.js         # Ticket creation logic
│       └── closeTicket.js          # Ticket closing logic
└── package.json
```

---

## ⚙️ CÀI ĐẶT BOT

### 1. Discord Bot Setup

1. **Tạo bot** tại https://discord.com/developers/applications
2. **Bot Permissions** cần:
   - Manage Channels
   - Send Messages
   - Embed Links
   - Read Message History
   - Add Reactions
3. **Privileged Gateway Intents**:
   - Server Members Intent
   - Message Content Intent

### 2. Environment Variables

```env
# Discord Bot
DISCORD_BOT_TOKEN=your_bot_token_here
DISCORD_CLIENT_ID=your_client_id
DISCORD_CLIENT_SECRET=your_client_secret
DISCORD_GUILD_ID=your_server_id

# Ticket Category
DISCORD_TICKET_CATEGORY_ID=1234567890  # ID của category chứa tickets
DISCORD_STAFF_ROLE_ID=1234567890       # Role ID của staff xử lý tickets
```

### 3. Khởi động bot

```bash
# Nếu bot ở /bot folder (standalone)
cd bot
npm install
npm start

# Hoặc nếu integrated trong /api
cd api
node bot/index.js
```

---

## 🔔 NOTIFICATIONS (Optional)

Có thể thêm thông báo khi:

### Khách nhận được:
```javascript
// Sau khi ticket tạo xong
const user = await client.users.fetch(discordId);
await user.send({
    content: `✅ Đơn hàng #${orderId} đã được tạo! Staff sẽ xử lý trong ít phút.`
});
```

### Staff nhận được:
```javascript
const staffRole = guild.roles.cache.get(STAFF_ROLE_ID);
await channel.send({
    content: `${staffRole} - Đơn hàng mới cần xử lý!`
});
```

---

## 📊 MONITORING

### Check ticket status:
```javascript
// API endpoint: GET /api/don-hang/:orderId/ticket-trang-thai
router.get('/:orderId/ticket-trang-thai', async (req, res) => {
    const order = await Order.findById(req.params.orderId);
    
    if (!order.discordTicketId) {
        return res.json({ hasTicket: false });
    }
    
    // Check if ticket channel still exists
    const channel = await client.channels.fetch(order.discordTicketId);
    
    res.json({
        hasTicket: true,
        ticketId: order.discordTicketId,
        ticketUrl: `https://discord.com/channels/${GUILD_ID}/${order.discordTicketId}`,
        isOpen: !!channel
    });
});
```

---

## 🚀 DEPLOYMENT

### Render (hoặc VPS):
```bash
# Start both API và Bot cùng lúc
# Option 1: PM2
pm2 start api/server.js --name api
pm2 start bot/src/index.js --name bot

# Option 2: Single process (api imports bot)
node api/server.js  # Bot tự khởi động trong server.js
```

### Vercel:
⚠️ Vercel không support long-running processes (bot)

**Giải pháp**:
- Deploy bot riêng trên Render/Railway/VPS
- API trên Vercel gọi bot qua HTTP webhook

---

## 📝 CHECKLIST SETUP

- [ ] Discord bot created & invited to server
- [ ] Ticket category created in Discord
- [ ] Staff role assigned
- [ ] Environment variables set (DISCORD_BOT_TOKEN, etc.)
- [ ] Bot code deployed & running
- [ ] Test: Place order → Bot creates ticket
- [ ] Test: Click "Đã Giao" → Order completes
- [ ] Test: Auto-create ticket (if using worker)

---

## 🎯 TÓM TẮT

**Bot làm gì?**
1. Tự động tạo ticket Discord khi đơn hàng được thanh toán
2. Hiển thị thông tin đơn hàng (Roblox username, số Robux)
3. Cung cấp nút "Đã Giao" cho staff
4. Tự động đóng ticket và update order status khi xong

**Ai giao Robux?**
- Staff giao tay (manual) - An toàn nhất
- Hoặc tự động qua game pass/private server

**Làm sao bot biết order đã thanh toán?**
- Check database: `paymentStatus === "da_thanh_toan"`
- Hoặc backend trigger event sau khi thanh toán

---

**Có câu hỏi thêm về bot payment flow? Cứ hỏi tôi!** 🤖
