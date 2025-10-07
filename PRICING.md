# 💰 Pricing Configuration

## Environment Variables

Bạn có thể config giá trong file `.env`:

```env
# Pricing Configuration (VND)
COURT_PRICE=120000  # Giá sân (120k VND)
SHUTTLE_PRICE=25000  # Giá cầu (25k VND)
FEMALE_PRICE=40000   # Giá cố định cho nữ (40k VND)
```

## Default Values

Nếu không config trong `.env`, hệ thống sẽ dùng giá mặc định:

| Item | Default Price | Description |
|------|--------------|-------------|
| **Sân** | 120,000 VND | Giá mỗi sân |
| **Cầu** | 25,000 VND | Giá mỗi quả cầu |
| **Nữ** | 40,000 VND | Giá cố định cho nữ |

## How to Change

### 1. Update .env file

```bash
# Edit .env
nano .env

# Add or update:
COURT_PRICE=150000  # Thay đổi giá sân lên 150k
SHUTTLE_PRICE=30000 # Thay đổi giá cầu lên 30k
FEMALE_PRICE=50000  # Thay đổi giá nữ lên 50k
```

### 2. Restart Docker

```bash
docker-compose down
docker-compose up -d
```

### 3. Verify

Check logs để xác nhận:

```bash
docker-compose logs app | grep -i price
```

## Calculation Logic

### Male Share
```
Remaining = (Court Total + Shuttle Total) - Female Total
Male Share = ROUND_UP(Remaining / Number of Males / 1000) × 1000
```

### Female Share
```
Female Share = FEMALE_PRICE (fixed)
```

### Not Going (Court Only)
```
Court Share = ROUND_UP(Court Total / Total Participants / 1000) × 1000
```

## Examples

### Scenario 1: Default Prices
- 2 sân × 120k = 240k
- 15 cầu × 25k = 375k
- Total: 615k
- 3 nam, 2 nữ

**Calculation:**
- Female Total: 2 × 40k = 80k
- Remaining: 615k - 80k = 535k
- Male Share: 535k / 3 = 179k (rounded)

**Result:**
- Male: 179k/person
- Female: 40k/person
- Total: (3 × 179k) + (2 × 40k) = 617k ≈ 615k

### Scenario 2: Custom Prices
```env
COURT_PRICE=150000
SHUTTLE_PRICE=30000
FEMALE_PRICE=50000
```

- 2 sân × 150k = 300k
- 15 cầu × 30k = 450k
- Total: 750k
- 3 nam, 2 nữ

**Calculation:**
- Female Total: 2 × 50k = 100k
- Remaining: 750k - 100k = 650k
- Male Share: 650k / 3 = 217k (rounded)

**Result:**
- Male: 217k/person
- Female: 50k/person

## Tips

1. **Always round up** to nearest 1000 VND for easy cash handling
2. **Female price is fixed** - không phụ thuộc số sân/cầu
3. **Male price is variable** - depends on remaining cost
4. **Not going members** - only pay court share, not shuttle

## Support

Nếu cần thay đổi logic tính toán, edit file:
- `/src/compute.js` - Main calculation logic
- `/src/commands.js` - Summary command

---

**Last Updated:** October 2, 2025

