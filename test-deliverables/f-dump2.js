const mysql = require('mysql2/promise')
const DB = { host: '127.0.0.1', port: 3306, user: 'root', password: 'admin', database: 'gardener_test', connectTimeout: 8000 }
;(async () => {
  const conn = await mysql.createConnection(DB)
  // backup_snapshots columns
  const [bcols] = await conn.query(`SELECT COLUMN_NAME, DATA_TYPE FROM information_schema.columns WHERE table_schema=? AND table_name='backup_snapshots' ORDER BY ORDINAL_POSITION`, [DB.database])
  console.log('### backup_snapshots COLS:', bcols.map(c=>c.COLUMN_NAME).join(', '))
  const [brows] = await conn.query('SELECT * FROM backup_snapshots LIMIT 1')
  if (brows[0]) console.log('SAMPLE:', JSON.stringify(brows[0]).slice(0,200))
  // attendances records full sample
  const [arows] = await conn.query('SELECT id, classId, records FROM attendances LIMIT 1')
  if (arows[0]) console.log('### attendances:', arows[0].id, arows[0].classId, arows[0].records)
  // notices endedAt / ended values sample (a few)
  const [nrows] = await conn.query('SELECT id, pinned, ended, endedAt, classId FROM notices LIMIT 3')
  console.log('### notices samples:', JSON.stringify(nrows))
  // todos done values
  const [trows] = await conn.query('SELECT id, done, note FROM todos LIMIT 3')
  console.log('### todos samples:', JSON.stringify(trows))
  // schedules weekType / note
  const [srows] = await conn.query('SELECT id, weekType, note, section FROM schedules LIMIT 3')
  console.log('### schedules samples:', JSON.stringify(srows))
  // award_records image
  const [awrows] = await conn.query('SELECT id, image, tags FROM award_records LIMIT 3')
  console.log('### award_records samples:', JSON.stringify(awrows))
  await conn.end()
})().catch(e=>{console.error('FATAL',e);process.exit(1)})
