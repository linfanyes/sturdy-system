<template>
  <view class="page" :class="{ dark: theme.mode === 'dark' }">
    <view class="head">
      <view class="h">📖 课外阅读记录</view>
      <view class="add" @click="openAdd">+ 记录</view>
    </view>

    <scroll-view scroll-x class="tabs">
      <text class="tab" :class="!filterType && 'on'" @click="filterType=''">全部</text>
      <text class="tab" v-for="t in types" :key="t" :class="filterType===t && 'on'" @click="filterType=t">{{ t }}</text>
    </scroll-view>

    <EmptyState v-if="!filtered.length" icon="📚" text="还没有阅读记录" hint="点击「+ 记录」添加" />

    <view class="list" v-else>
      <view class="row" v-for="r in filtered" :key="r.id">
        <view class="info">
          <view class="top"><text class="nm">{{ r.studentName }}</text><text class="date">{{ r.date }}</text></view>
          <text class="bk">📚 {{ r.bookTitle }}{{ r.author ? ' · ' + r.author : '' }}</text>
          <text class="meta">{{ r.pages }}页 · {{ r.minutes }}分钟</text>
          <text class="note" v-if="r.note">{{ r.note }}</text>
        </view>
        <view class="acts">
          <text class="ed" @click="openEdit(r)">编辑</text>
          <text class="del" @click="del(r)">删除</text>
        </view>
      </view>
    </view>

    <view class="mask" v-if="show" @click="show=false"></view>
    <view class="modal" v-if="show">
      <view class="mt">{{ editing ? '编辑阅读记录' : '新增阅读记录' }}</view>
      <view class="hint">选择「班级 + 学生」后保存，家长端即可看到该孩子的阅读记录。</view>
      <picker :range="classNames" @change="onClassPick">
        <view class="picker">{{ form.classId ? selectedClassName : '选择班级（可选）' }}</view>
      </picker>
      <picker :range="stuNames" :disabled="!form.classId" @change="onStudentPick">
        <view class="picker" :class="{ dim: !form.classId }">{{ form.studentId ? form.studentName : (form.classId ? '选择学生（推荐）' : '请先选择班级') }}</view>
      </picker>
      <input v-model="form.studentName" class="inp" placeholder="学生姓名（选择学生后自动填充）" />
      <input v-model="form.bookTitle" class="inp" placeholder="书名" />
      <input v-model="form.author" class="inp" placeholder="作者（可选）" />
      <input v-model="form.pages" type="number" class="inp" min="1" max="9999" placeholder="阅读页数" />
      <input v-model="form.minutes" type="number" class="inp" min="1" max="999" placeholder="阅读时长（分钟）" />
      <picker mode="date" :value="form.date" @change="e=>form.date=e.detail.value">
        <view class="picker">日期：{{ form.date }}</view>
      </picker>
      <textarea v-model="form.note" class="inp area" placeholder="备注（读后感等）" />
      <view class="mbtns">
        <view class="mb cancel" @click="show=false">取消</view>
        <view class="mb ok" :class="{disabled:saving}" @click="save">{{ saveText }}</view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onShow, onPullDownRefresh } from '@dcloudio/uni-app'
import { listReadingLogs, createReadingLog, updateReadingLog, removeReadingLog } from '@/api/reading'
import { listClasses, listStudents } from '@/api/students'
import { theme } from '../../common/store'
import EmptyState from '../../components/EmptyState/EmptyState.vue'

const list = ref([])
const show = ref(false)
const editing = ref(null)
const saving = ref(false)
const filterType = ref('')
const types = ['本月', '本周', '今天']
const classes = ref([]), stuList = ref([])
const form = ref({ studentName:'', studentId:'', classId:'', bookTitle:'', author:'', pages:0, minutes:0, date:today(), note:'' })

const classNames = computed(()=>classes.value.map(c=>c.name))
const stuNames = computed(()=>stuList.value.map(s=>s.name))
const selectedClassName = computed(()=>classes.value.find(c=>c.id===form.value.classId)?.name||'')

function today() { const d=new Date(); const p=n=>(n<10?'0'+n:''+n); return d.getFullYear()+'-'+p(d.getMonth()+1)+'-'+p(d.getDate()) }

const filtered = computed(() => {
  let arr = [...list.value].sort((a,b)=>(b.date||'').localeCompare(a.date||''))
  if (filterType.value==='本月') {
    const m = new Date().getMonth()+1
    arr = arr.filter(r=>new Date(r.date).getMonth()+1===m)
  } else if (filterType.value==='本周') {
    const now = new Date(), wd = now.getDay()||7
    const mon = new Date(now); mon.setDate(now.getDate()-wd+1)
    arr = arr.filter(r=>new Date(r.date) >= mon)
  } else if (filterType.value==='今天') {
    arr = arr.filter(r=>r.date===today())
  }
  return arr
})

const saveText = computed(()=>saving.value?'保存中…':'保存')

async function load() { list.value = await listReadingLogs({loading:true,loadingText:'加载阅读'}); if(!classes.value.length) classes.value = await listClasses({silent:true}) }
onShow(load)
onPullDownRefresh(async()=>{await load();uni.stopPullDownRefresh()})

function openAdd() { editing.value=null; form.value={studentName:'',studentId:'',classId:'',bookTitle:'',author:'',pages:0,minutes:0,date:today(),note:''}; stuList.value=[]; show.value=true }
function openEdit(r) { editing.value=r; form.value={studentName:r.studentName,studentId:r.studentId||'',classId:r.classId||'',bookTitle:r.bookTitle,author:r.author||'',pages:r.pages||0,minutes:r.minutes||0,date:r.date,note:r.note||''}; if(form.value.classId) listStudents(form.value.classId,{silent:true}).then(s=>stuList.value=s); show.value=true }
async function onClassPick(e) {
  const c = classes.value[+e.detail.value]
  form.value.classId = c.id; form.value.studentId=''; form.value.studentName=''
  stuList.value = await listStudents(c.id, {silent:true})
}
function onStudentPick(e) {
  const s = stuList.value[+e.detail.value]
  if (!s) return
  form.value.studentId = s.id; form.value.studentName = s.name
}
async function save() {
  if (saving.value) return
  if (!form.value.bookTitle.trim()) return uni.showToast({title:'请填写书名',icon:'none'})
  saving.value=true
  try {
    const payload = { ...form.value, pages:Number(form.value.pages)||0, minutes:Number(form.value.minutes)||0 }
    if (!form.value.studentId) delete payload.studentId // 未选真实学生时不写伪造ID
    if (editing.value) { const r=await updateReadingLog(editing.value.id,payload); Object.assign(editing.value,r) }
    else { const r=await createReadingLog(payload); list.value.unshift(r && r.id ? r : {...payload,id:String(Date.now())}) }
    show.value=false; uni.showToast({title:'已保存',icon:'none'})
  } catch(e) { uni.showToast({title:'失败:'+(e.message||''),icon:'none'}) }
  finally { saving.value=false }
}
function del(r) { uni.showModal({title:'删除',content:r.bookTitle,success:async(m)=>{if(!m.confirm)return;try{await removeReadingLog(r.id);list.value=list.value.filter(x=>x.id!==r.id)}catch(e){uni.showToast({title:'失败',icon:'none'})}}}) }
</script>

<style scoped>
.page { padding:24rpx; }
.head { display:flex; align-items:center; justify-content:space-between; margin-bottom:14rpx; }
.h { font-size:36rpx; font-weight:800; color:var(--c-title); }
.add { font-size:28rpx; color:#fff; background:var(--c-primary); padding:12rpx 26rpx; border-radius:40rpx; }
.tabs { white-space:nowrap; margin-bottom:12rpx; }
.tab { display:inline-block; font-size:24rpx; padding:10rpx 22rpx; border-radius:30rpx; background:var(--c-card2); color:var(--c-sub); margin-right:12rpx; }
.tab.on { background:var(--c-primary); color:#fff; }
.empty { text-align:center; color:var(--c-sub); padding:60rpx 0; }
.list { background:var(--c-card); border-radius:16rpx; padding:10rpx 24rpx; }
.row { display:flex; padding:18rpx 0; border-bottom:1px solid var(--c-card2); gap:14rpx; }
.info { flex:1; min-width:0; }
.top { display:flex; justify-content:space-between; align-items:center; }
.nm { font-size:28rpx; font-weight:700; color:var(--c-title); }
.date { font-size:22rpx; color:var(--c-sub); }
.bk { display:block; font-size:26rpx; color:var(--c-accent); margin-top:6rpx; }
.meta { font-size:24rpx; color:var(--c-sub); margin-top:4rpx; display:block; }
.note { font-size:24rpx; color:#6a6058; margin-top:4rpx; display:block; }
.acts { display:flex; flex-direction:column; gap:12rpx; 
  align-items: flex-end;
}
.ed { font-size:24rpx; color:var(--c-blue); }
.del { font-size:24rpx; color:var(--c-danger); }
.mask { position:fixed; inset:0; background:rgba(0,0,0,.4); z-index:50; }
.modal { position:fixed; left:5%; right:5%; bottom:0; z-index:51; background:var(--c-card); border-radius:24rpx 24rpx 0 0; padding:30rpx; padding-bottom: calc(30rpx + env(safe-area-inset-bottom)); max-height:90vh; overflow-y:auto; }
.mt { font-size:32rpx; font-weight:700; margin-bottom:20rpx; color:var(--c-title); }
.hint { font-size:22rpx; color:var(--c-accent); margin-bottom:14rpx; line-height:1.5; }
.inp { border:1px solid var(--c-border); border-radius:12rpx; padding:16rpx; margin-bottom:14rpx; font-size:28rpx; width:100%; box-sizing:border-box; background:var(--c-card); }
.area { height:110rpx; }
.picker { background:var(--c-card2); border-radius:12rpx; padding:18rpx; margin-bottom:14rpx; font-size:28rpx; }
.picker.dim { color:var(--c-sub); }
.mbtns { display:flex; gap:20rpx; }
.mb { flex:1; text-align:center; padding:22rpx; border-radius:40rpx; font-size:30rpx; }
.mb.cancel { background:var(--c-card2); color:#666; }
.mb.ok { background:var(--c-primary); color:#fff; }
.mb.disabled { opacity:0.5; }
</style>
