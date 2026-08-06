# 图片压缩策略规范（Image Compression Spec）

> 规范版本：v1.0  
> 适用范围：园丁工作台 Web 端（Vue 3）+ 小程序端（uni-app）  
> 目的：统一两端图片压缩策略，使上传图片大小上限、视觉质量一致，后端接收无差异化处理。

---

## 1. 角色与流程

```
[用户选图] → [前端压缩] → [转 base64 / tempFilePath] → [上传到后端] → [OSS / 磁盘持久化]
```

**原则**：
- 压缩在前端完成，后端仅保存原始字节（不缩放）。
- 目的：**控制传输体积 + 节省存储**，避免移动端原图（10MB+）直传导致上传慢 / 失败。

---

## 2. 统一压缩参数

| 参数 | Web 端 | 小程序端 | 说明 |
|---|---|---|---|
| `maxWidth` | **1280** | **1280** | 长边上限（像素） |
| `maxHeight` | **1280** | **1280** | 短边自适应等比缩放 |
| `quality` | **0.7**（70%） | **80**（接口数值 0–100） | JPEG 质量，视觉无感知差异优先 |
| `fileType` | `image/jpeg` | `jpg` | 不支持 PNG 保留 Alpha 场景统一转 JPG |
| 小图跳过 | `< 200 KB` 跳过压缩 | **不跳过**（小图也走压缩流水线，保证行为一致） | 简化分支判断 |
| 输出格式 | DataURL (`data:image/jpeg;base64,...`) | tempFilePath → 转 base64 | 由上传适配层决定 |

> **说明**：`quality` 编码侧不同（Web 0–1，小程序 0–100）但目标视觉质量等价；建议 Web 端提升到 `0.8` 以与小程序 `quality: 80` 完全一致。

### 2.1 目标文件大小

| 原始大小 | 压缩后目标 |
|---|---|
| ≤ 200 KB | 直接传（或单步压缩） |
| 200 KB – 1 MB | ≤ 300 KB |
| 1 MB – 5 MB | ≤ 500 KB |
| > 5 MB | ≤ 800 KB（rec 若仍超限提示用户重选/重拍） |

> 以上目标为经验值；实际取决于图片内容（纯色 vs 复杂纹理）。**前端不做多次迭代压缩**，单次即可，避免 UI 卡顿。

---

## 3. 各端实现约定

### 3.1 Web 端（`web-app/src/composables/usePhotoUpload.ts`）

使用 `canvas.toDataURL('image/jpeg', quality)` 方案：

```typescript
export async function compressImage(
  file: File,
  maxWidth = 1280,
  quality = 0.8, // 推荐从 0.7 提升到 0.8，与小程序对齐
): Promise<string> {
  // 1. 读取为 DataURL
  // 2. 构造 Image，加载 DataURL
  // 3. 等比缩放：短边不变，长边 ≤ maxWidth
  // 4. canvas.drawImage
  // 5. canvas.toDataURL('image/jpeg', quality)
}
```

- 使用 `OffscreenCanvas`（如可用）以避免主线程阻塞。
- 大图（长边 > 4000）可考虑先降采样（createImageBitmap + step-down）避免内存峰值。

### 3.2 小程序端（`mini-program/src/common/image.js`）

使用 `wx.createOffscreenCanvas` + `uni.canvasToTempFilePath`（如 OffscreenCanvas 不可用时降级：原图直传）：

```javascript
export function compressImage({ src, maxWidth = 1280, maxHeight = 1280, quality = 80, fileType = 'jpg' }) {
  // 1. uni.getImageInfo 读原图宽高
  // 2. 等比缩放：长边 ≤ maxWidth
  // 3. createOffscreenCanvas({ type: '2d', width, height })
  // 4. ctx.drawImage(img, 0, 0, w, h)
  // 5. uni.canvasToTempFilePath({ canvas, fileType, quality: quality / 100 })
  // 6. 返回 { tempFilePath, size, width, height }
}
```

- 若 `wx.createOffscreenCanvas` 不可用（旧基础库），**降级为原图** 并提示用户"设备不支持压缩，将上传原图"。
- 压缩后通过 `readImageAsBase64` 走 `wx.cloud.callContainer` 上传。

---

## 4. 异常与降级

| 场景 | 策略 |
|---|---|
| 原图 ≤ 200 KB（Web） | 跳过压缩 |
| 小程序 wx.createOffscreenCanvas 不可用 | 原图直传 + toast 提示 |
| canvas 导出失败（跨域 / tainted） | 原图直传 |
| 压缩后仍 > 1 MB | 提示用户"图片过大，建议重新选择或拍摄" |
| 非图片文件 | 直接拒绝（前端 accept="image/*" + 后端 magic bytes 校验） |

---

## 5. 后端无关化

后端**不依赖前端已压缩**：

- 接收 `multipart/form-data`（Web）或 base64 body（小程序云托管链路）。
- 若业务图仍需做 **多规格缩略图**（头像 200×200、封面 750×400），应由后端在接收后生成（sharp / ImageMagick / 云服务）。
- 后端保存的为主图，可作原图存档。

---

## 6. 校验清单（Checklist）

- [ ] 两端 `maxWidth` 配置项统一放在 shared/constants 读取
- [ ] Web `quality` 与小程序 `quality` 数值约定清晰（建议使用 percent 0–100）
- [ ] 压缩失败有 toast 提示（国际化文案）
- [ ] 选择图片数量上限：单选 / 9 张（看业务）
- [ ] 上传前校验文件类型（accept + 魔数）
- [ ] 上传中显示 loading，可取消

---

## 7. 后续优化（TODO）

- **schema 驱动**：压缩参数（maxWidth / quality / fileType）通过 `gallerySchema` 按场景配置（头像 vs 班级风采 vs 作业批注）。
- **共享函数**：`compressImage` 抽到 `shared/utils/image.ts`，各端注入平台 adapter（getFile / createCanvas / export）。
- **质量自适应**：根据原图大小动态调整 quality，目标文件上限 500 KB。

---

## 附录：当前状态

| 端 | 文件 | maxWidth | quality | 符合规范 |
|---|---|---|---|---|
| Web | `web-app/src/composables/usePhotoUpload.ts` | 1280 | 0.7（建议提升到 0.8） | 部分符合 |
| 小程序 | `mini-program/src/common/image.js` | 1280 | 80 | ✅ 符合 |

> 修改 Web 端 `quality` 到 0.8 后即完全符合本规范。方案见 `TODO`。
