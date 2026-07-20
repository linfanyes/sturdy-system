<template>
  <view class="page" :class="{ dark: theme.mode === 'dark' }">
    <view class="head"><view class="h">📅 学期教学日历</view><view class="add" @click="openAdd">+ 添加计划</view></view>

    <view class="month-nav">
      <text class="mn-btn" @click="changeMonth(-1)">◀</text>
      <text class="mn-title">{{ year }}年{{ month }}月</text>
      <text class="mn-btn" @click="changeMonth(1)">▶</text>
    </view>

    <view class="weekdays">
      <text class="wd" v-for="d in ['日','一','二','三','四','五','六']" :key="d">{{ d }}</text>
    </view>
    <view class="grid">
      <view v-for="(d,i) in days" :key="i" class="day" :class="{other:d.other, today:d.today, has:d.items.length}">
        <text class="d-n">{{ d.num }}</text>
        <view class="d-items" v-if="d.items.length">
          <view v-for="(it,j) in d.items.slice(0,3)" :key="j" class="d-it" :style="{background:it.color||'#e8f1fb'}">{{ it.title }}</view>
          <text v-if="d.items.length>3" class="d-more">+{{ d.items.length-3 }}</text>
        </view>
      </view>
    </view>

    <view class="list" v-if="items.length">
      <view class="row" v-for="it in items" :key="it.id">
        <view class="d-c" :style="{background:it.color||'#e8f1fb'}"></view>
        <view class="info">
          <text class="nm">{{ it.title }}</text>
          <text class="meta">{{ it.date }}{{ it.grade?' · '+it.grade:'' }}{{ it.subject?' · '+it.subject:'' }}</text>
        </view>
        <view class="acts">
          <text class="ed" @click="openEdit(it)">编辑</text>
          <text class="del" @click="del(it)">删除</text>
        </view>
      </view>
    </view>

    <view class="mask" v-if="show" @click="show=false"></view>
    <view class="modal" v-if="show">
      <view class="mt">{{ editing?'编辑':'新增计划' }}</view>
      <input v-model="form.title" class="inp" placeholder="计划标题" />
      <picker mode="date" :value="form.date" @change="e=>form.date=e.detail.value"><view class="picker">日期：{{ form.date }}</view></picker>
      <input v-model="form.grade" class="inp" placeholder="年级（可选）" />
      <input v-model="form.subject" class="inp" placeholder="科目（可选）" />
      <textarea v-model="form.note" class="inp area" placeholder="备注" />
      <view class="colors"><text v-for="c in colors" :key="c" class="cc" :class="form.color===c&&'on'" :style="{background:c}" @click="form.color=c"></text></view>
      <view class="mbtns"><view class="mb cancel" @click="show=false">取消</view><view class="mb ok" :class="{disabled:saving}" @click="save">{{saving?'保存中…':'保存'}}</view></view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onShow, onPullDownRefresh } from '@dcloudio/uni-app'
import api from '../../common/request'
import { theme } from '../../common/store'

const items = ref([])
const show = ref(false), editing = ref(null), saving = ref(false)
const colors = ['#e8f1fb','#e8f9e8','#fff3e0','#fde8ea','#fff8e1','#f3eefb']
const form = ref({ title:'', date:new Date().toISOString().slice(0,10), grade:'', subject:'', color:'#e8f1fb', note:'' })

const now = new Date()
const year = ref(now.getFullYear()), month = ref(now.getMonth()+1)

const days = computed(() => {
  const y=year.value, m=month.value
  const first=new Date(y,m-1,1), last=new Date(y,m,0)
  const startDow=first.getDay(), totalDays=last.getDate()
  const today=new Date()
  const arr=[]
  for(let i=0;i<startDow;i++) arr.push({num:'',other:true,items:[]})
  for(let d=1;d<=totalDays;d++) {
    const ds=y+'-'+String(m).padStart(2,'0')+'-'+String(d).padStart(2,'0')
    arr.push({num:d,other:false,today:y===today.getFullYear()&&m===today.getMonth()+1&&d===today.getDate(),items:items.value.filter(it=>it.date===ds)})
  }
  return arr
})

function changeMonth(dir) {
  let m=month.value+dir; let y=year.value
  if(m<1){m=12;y--}else if(m>12){m=1;y++}
  month.value=m; year.value=y
}

async function load() { items.value = await api.getList('/todos',{loading:true,loadingText:'加载日历'}) }
onShow(load)
onPullDownRefresh(async()=>{await load();uni.stopPullDownRefresh()})
function openAdd() { form.value={title:'',date:year.value+'-'+String(month.value).padStart(2,'0')+'-'+String(new Date().getDate()).padStart(2,'0'),grade:'',subject:'',color:'#e8f1fb',note:''}; show.value=true }
function openEdit(it) { editing.value=it; form.value={title:it.title,date:it.date,grade:it.grade||'',subject:it.subject||'',color:it.color||'#e8f1fb',note:it.note||''}; show.value=true }
async function save() {
  if (saving.value) return
  if (!form.value.title.trim()) return uni.showToast({title:'请填写标题',icon:'none'})
  saving.value=true
  try {
    const payload = {...form.value}
    if (editing.value) { const r=await api.patch('/todos/'+editing.value.id,payload); Object.assign(editing.value,r) }
    else { const r=await api.post('/todos',payload); items.value.unshift(r) }
    show.value=false; uni.showToast({title:'已保存',icon:'none'})
  } catch(e) { uni.showToast({title:'失败:'+(e.message||''),icon:'none'}) }
  finally { saving.value=false }
}
function del(it) { uni.showModal({title:'删除',content:it.title,success:async(m)=>{if(!m.confirm)return;try{await api.del('/todos/'+it.id);items.value=items.value.filter(x=>x.id!==it.id)}catch(e){uni.showToast({title:'失败',icon:'none'})}}}) }
</script>

<style scoped>
.page { padding:24rpx; }
.head { display:flex; align-items:center; justify-content:space-between; margin-bottom:14rpx; }
.h { font-size:36rpx; font-weight:800; color:var(--c-title); }
.add { font-size:28rpx; color:#fff; background:var(--c-primary); padding:12rpx 26rpx; border-radius:40rpx; }
.month-nav { display:flex; align-items:center; justify-content:center; gap:24rpx; margin-bottom:14rpx; }
.mn-btn { font-size:30rpx; color:var(--c-accent); padding:0 12rpx; }
.mn-title { font-size:30rpx; font-weight:700; color:var(--c-title); }
.weekdays { display:grid; grid-template-columns:repeat(7,1fr); margin-bottom:4rpx; }
.wd { text-align:center; font-size:22rpx; color:var(--c-sub); padding:8rpx 0; }
.grid { display:grid; grid-template-columns:repeat(7,1fr); gap:4rpx; }
.day { min-height:80rpx; border-radius:10rpx; padding:4rpx; background:var(--c-card); display:flex; flex-direction:column; font-size:20rpx; }
.day.other { opacity:0.3; }
.day.today { background:var(--c-accent); }
.day.today .d-n { color:#fff; }
.day.has { background:var(--c-card2); }
.d-n { font-weight:700; color:var(--c-title); font-size:22rpx; }
.d-items { margin-top:2rpx; }
.d-it { font-size:16rpx; padding:1rpx 4rpx; border-radius:6rpx; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; margin-bottom:2rpx; }
.d-more { font-size:16rpx; color:var(--c-sub); }
.list { background:var(--c-card); border-radius:16rpx; padding:10rpx 24rpx; margin-top:16rpx; }
.row { display:flex; align-items:center; gap:14rpx; padding:16rpx 0; border-bottom:1px solid var(--c-card2); }
.d-c { width:12rpx; height:12rpx; border-radius:50%; flex-shrink:0; }
.info { flex:1; }
.nm { display:block; font-size:28rpx; color:var(--c-title); }
.meta { font-size:22rpx; color:var(--c-sub); }
.acts { display:flex; gap:18rpx; }
.ed { font-size:24rpx; color:#409eff; }
.del { font-size:24rpx; color:var(--c-danger); }
.mask { position:fixed; inset:0; background:rgba(0,0,0,.4); z-index:50; }
.modal { position:fixed; left:5%; right:5%; bottom:0; z-index:51; background:var(--c-card); border-radius:24rpx 24rpx 0 0; padding:30rpx; max-height:90vh; overflow-y:auto; }
.mt { font-size:32rpx; font-weight:700; margin-bottom:20rpx; color:var(--c-title); }
.inp { border:1px solid var(--c-border); border-radius:12rpx; padding:16rpx; margin-bottom:14rpx; font-size:28rpx; width:100%; box-sizing:border-box; }
.area { height:100rpx; }
.picker { background:var(--c-card2); border-radius:12rpx; padding:18rpx; margin-bottom:14rpx; font-size:28rpx; }
.colors { display:flex; gap:12rpx; margin-bottom:14rpx; }
.cc { width:40rpx; height:40rpx; border-radius:50%; }
.cc.on { outline:3rpx solid var(--c-accent); outline-offset:2rpx; }
.mbtns { display:flex; gap:20rpx; }
.mb { flex:1; text-align:center; padding:22rpx; border-radius:40rpx; font-size:30rpx; }
.mb.cancel { background:var(--c-card2); color:#666; }
.mb.ok { background:var(--c-primary); color:#fff; }
.mb.disabled { opacity:0.5; }
</style>
