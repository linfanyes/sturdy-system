"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const seed_common_1 = require("./seed-common");
async function main() {
    const m = (0, seed_common_1.loadManifest)();
    if (!m) {
        console.log(`⚠ 未找到种子清单 ${seed_common_1.MANIFEST_PATH}，无需清除（可能已清除或未生成过）。`);
        return;
    }
    const ds = (0, seed_common_1.buildDataSource)();
    await ds.initialize();
    console.log('✅ 数据库连接成功，开始按清单清除测试数据...');
    await (0, seed_common_1.clearByManifest)(ds, m);
    console.log('\n✅ 测试数据清除完成');
    await ds.destroy();
}
main().catch((e) => {
    console.error('❌ 清除失败:', e?.message || e);
    if (e?.stack)
        console.error(e.stack);
    process.exit(1);
});
