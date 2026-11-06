# Chess War

Roguelike cờ vua lấy ý tưởng từ Shotgun King. Bạn điều khiển 1 quân đặc biệt chống lại quân trắng, qua từng wave, chọn buff. Làm thành tựu để mở quân mới. Pixel-art retro, toàn bộ hình vẽ bằng code (canvas), không có file ảnh. Bật/tắt CRT trong Settings. Không có dependency.

## Chạy

    npm start          # hoặc: python3 -m http.server 8000
    # mở http://localhost:8000

ES modules không chạy được bằng file://, cần server tĩnh.

## Test

    npm test           # node tests/game.test.mjs

## Cấu trúc

    index.html            một canvas duy nhất
    css/style.css         căn giữa + pixelated
    js/main.js            vòng lặp, chuyển cảnh, scale nguyên, CRT
    js/app.js             state chung (save, game, điều hướng)
    js/game.js, moves.js, pieces.js, buffs.js, achievements.js, storage.js   logic (không DOM)
    js/art/               bảng màu, font bitmap, icon, dữ liệu sprite (ASCII)
    js/gfx/               pixel.js, sprites.js, board.js, fx.js
    js/anim/              Director (state machine), Actor, steps, easing: xem docs/ANIMATION.md
    js/ui/ui.js           nút/thanh vẽ trên canvas
    js/scenes/            title, characters, achievements, settings, play, summary
    tests/                game, art, anim (.test.mjs), e2e.mjs (tuỳ chọn, cần playwright)
    docs/                 DESIGN.md (luật), REDESIGN.md (hình ảnh), ANIMATION.md (chuyển động)

## Thêm quân mới

1. Thêm mục vào `PIECES` (js/pieces.js) + 3 buff vào `BUFFS` (js/buffs.js).
2. Thêm lưới ASCII vào `js/art/sprites-data.js` (hoặc hàm vẽ riêng) + hàm `CHAR`/`AURA`/`BACK` trong `js/gfx/sprites.js`.
3. Thêm thành tựu mở nó vào `ACH` (js/achievements.js).
