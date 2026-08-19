"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const seed_common_1 = require("./seed-common");
async function main() {
    const ds = (0, seed_common_1.buildDataSource)();
    await ds.initialize();
    console.log('✅ 数据库连接成功，开始清理 grades 重复数据...');
    const qr = ds.createQueryRunner();
    await qr.connect();
    try {
        const dups = await qr.query(`SELECT classId, examName, subject, COUNT(*) AS cnt
       FROM grades
       GROUP BY classId, examName, subject
       HAVING cnt > 1`);
        if (!dups.length) {
            console.log('ℹ 未发现重复数据，无需清理。');
        }
        else {
            console.log(`ℹ 发现 ${dups.length} 组重复，开始逐组去重（保留最新一条）...`);
            let deletedTotal = 0;
            for (const d of dups) {
                const rows = await qr.query(`SELECT id FROM grades
           WHERE classId = ? AND examName = ? AND subject = ?
           ORDER BY createdAt DESC`, [d.classId, d.examName, d.subject]);
                const keepId = rows[0]?.id;
                const removeIds = rows.slice(1).map((r) => r.id);
                if (removeIds.length) {
                    await qr.query(`DELETE FROM grades WHERE id IN (?)`, [removeIds]);
                    deletedTotal += removeIds.length;
                    console.log(`  · ${d.classId.slice(0, 8)}… / ${d.examName} / ${d.subject}：保留 ${keepId.slice(0, 8)}…，删除 ${removeIds.length} 条`);
                }
            }
            console.log(`✅ 共删除 ${deletedTotal} 条重复记录。`);
        }
        const indexName = 'idx_grades_unique_submission';
        console.log(`ℹ 尝试重建唯一索引 ${indexName} ...`);
        try {
            await qr.query(`ALTER TABLE grades DROP INDEX \`${indexName}\``);
            console.log(`  · 已删除旧索引 ${indexName}`);
        }
        catch {
        }
        try {
            await qr.query(`ALTER TABLE grades ADD UNIQUE INDEX \`${indexName}\` (classId, examName, subject)`);
            console.log(`  · 已创建唯一索引 ${indexName}`);
        }
        catch (e) {
            console.error(`❌ 创建唯一索引失败：${e?.message || e}`);
            console.error('   仍有重复数据未清理干净，请检查 grades 表。');
            process.exitCode = 1;
        }
    }
    finally {
        await qr.release();
        await ds.destroy();
    }
}
main().catch((e) => {
    console.error('❌ 清理失败:', e?.message || e);
    if (e?.stack)
        console.error(e.stack);
    process.exit(1);
});
