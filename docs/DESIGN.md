# Chess War: thiết kế v0.1

## Ý tưởng
Shotgun King đảo ngược: bàn 8x8, bạn là 1 quân đặc biệt, địch là quân cờ thường tiến về phía bạn. Mỗi quân của bạn có cách đi, 1 chiêu chủ động và bộ buff riêng.

## Vòng chơi
1. Chọn quân (chỉ quân đã mở).
2. Mỗi wave: địch xuất hiện ở 4 hàng trên. Bạn đi 1 nước (ăn quân = đi vào ô địch) hoặc dùng chiêu. Sau đó mọi địch đi 1 nước.
3. Ô đỏ nhạt = ô địch sẽ đánh trong lượt tới.
4. Diệt hết wave: hồi 1 máu, chọn 1 trong 3 buff, sang wave sau.
5. Hết máu: thua. Chỉ số cộng dồn vào thành tựu (lưu localStorage).

## Luật
- Địch đánh trúng ô bạn đứng: -1 khiên hoặc -1 máu (địch không ăn bạn, nó đứng yên).
- Tốt đi thẳng/ngang, đánh chéo trước. Mã/Tượng/Xe/Hậu đi đúng luật cờ, bị chặn bởi quân khác.
- Địch tiến theo hướng gần bạn nhất (tham lam, không nhìn trước).
- Ngân sách wave = 2 + 2*wave. Giá: Tốt 1, Mã/Tượng 3, Xe 5, Hậu 9. Mã/Tượng từ wave 2, Xe từ 4, Hậu từ 6.
- Hồi chiêu: số lượt phải chờ sau khi dùng.

## Quân
| Quân | Đi | Chiêu | Buff riêng |
|---|---|---|---|
| Void (mặc định) | Vua | Xoá sổ: xoá địch quanh bạn | Vực sâu, Đói khát, Khe nứt |
| Error | Mã; địch 20% đi lạc | Hoán đổi: đổi chỗ + choáng địch trong 3 ô | Nhiễu loạn, Segfault, Màn hình xanh |
| Time | Vua | Ngưng đọng (miễn phí): địch đứng yên 1 lượt | Ngưng trệ, Nước rút, Nghịch lý |
| Space | Xe tối đa 3 ô | Dịch chuyển tới ô trống bất kỳ | Mở rộng, Gấp không gian, Sóng xung kích |
| Black Hole | Vua | Kỳ dị: hút địch 1 bước rồi nuốt quân kề | Trọng lực, Chân trời sự kiện, Tích tụ |
| Ký sinh | Vua; ăn quân nào đi như quân đó | Lây nhiễm: địch chết sau 2 lượt, lây quân kề | Độc lực, Dịch bệnh, Ngấu nghiến |

Buff chung: Cường tráng (+máu), Thần tốc (hồi chiêu -1), Khiên.

## Thành tựu
| Thành tựu | Điều kiện | Mở |
|---|---|---|
| Khởi động | Tổng 25 kill | Error |
| Trụ vững | Đạt wave 5 | Time |
| Phù thuỷ | Dùng chiêu 20 lần | Space |
| Đồ tể | Tổng 80 kill | Black Hole |
| Bất tử | Đạt wave 8 | Ký sinh |

## Kiến trúc
`game.js` thuần logic (state + hàm), không DOM, test được bằng node. `main.js` chỉ vẽ và nhận input. Quân/buff/thành tựu là dữ liệu khai báo; buff dùng hook `g.hooks.kill` / `g.hooks.ability`.

## Chưa làm (bỏ có chủ đích)
- Animation di chuyển (hiện nhảy ô tức thì), âm thanh.
- Vua địch / boss, Hậu có chiêu.
- Lưu giữa trận; cân bằng số liệu (chưa chơi thử nhiều).
- Chiêu Time chưa có "tua lại", chỉ ngưng đọng.
