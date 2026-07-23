<template>
  <view class="page" :class="{ dark: theme.mode === 'dark' }">
    <view class="head">
      <view class="h">✅ 学生打卡记录</view>
      <view class="add" @click="openAdd">+ 打卡</view>
    </view>
    <scroll-view scroll-x class="types">
      <text v-for="t in cTypes" :key="t.k" class="ty" :class="selType===t.k&&'on'" @click="selType=t.k">{{ t.icon }} {{ t.label }}</text>
    </scroll-view>
    <view class="summary" v-if="classId">
      <view v-for="s in summary" :key="s.label" class="sc"><text class="sn">{{ s.count }}</text><text class="sl">{{ s.label }}</text></view>
    </view>
    <EmptyState v-if="!filtered.length" icon="✅" text="还没有打卡记录" hint="点击「+ 打卡」开始" />
    <view class="list" v-else>
      <view class="row" v-for="c in filtered" :key="c.id">
        <view class="ic" :style="{background:cType(c.type).bg}">{{ cType(c.type).icon }}</view>
        <view class="info">
          <text class="nm">{{ c.studentName }} · {{ c.type }}</text>
          <text class="meta">{{ c.date }}{{ c.count>1?' · x'+c.count:'' }}</text>
        </view>
        <text class="del" @click="del(c)">删除</text>
      </view>
    </view>
    <view class="sheet" v-if="show">
      <input v-model="form.studentName" class="inp" placeholder="学生姓名" />
      <picker :range="cTypes.map(t=>t.label)" @change="e=>form.type=cTypes[e.detail.value].k">
        <view class="picker sm">类型：{{ form.type||'请选择' }}</view>
      </picker>
      <picker mode="date" :value="form.date" @change="e=>form.date=e.detail.value"><view class="picker sm">日期：{{ form.date }}</view></picker>
      <input v-model="form.count" type="number" class="inp" placeholder="数量(默认1)" />
      <textarea v-model="form.note" class="inp area" placeholder="备注" />
      <button class="ok" :disabled="saving" @click="save">{{ saving?'保存中…':'保存' }}</button>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onShow, onPullDownRefresh } from '@dcloudio/uni-app'
import api from '../../common/request'
import { theme } from '../../common/store'
import EmptyState from '../../components/EmptyState/EmptyState.vue'

const list = ref([]), show = ref(false), saving = ref(false), selType = ref('')
const cTypes = [{k:'阅读',icon:'📖',label:'阅读',bg:'#e8f9e8'},{k:'运动',icon:'🏃',label:'运动',bg:'#e8f1fb'},{k:'练字',icon:'✍️',label:'练字',bg:'#fff3e0'},{k:'家务',icon:'🧹',label:'家务',bg:'#fdeef0'},{k:'行为',icon:'⭐',label:'行为',bg:'#fff8e1'}]
const form = ref({ studentName:'', type:'阅读', date:new Date().toISOString().slice(0,10), count:1, note:'' })

const filtered = computed(()=>selType.value?list.value.filter(c=>c.type===selType.value):list.value)
const summary = computed(()=>cTypes.map(t=>({...t,count:list.value.filter(c=>c.type===t.k).reduce((s,c)=>s+(c.count||1),0)})))
const cType = (t)=>cTypes.find(x=>x.k===t)||{icon:'📝',bg:'#f3f3f3'}

async function load() { list.value = await api.getList('/checkins',{loading:true,loadingText:'加载打卡'}) }
onShow(load)
onPullDownRefresh(async()=>{await load();uni.stopPullDownRefresh()})
function openAdd() { form.value={studentName:'',type:'阅读',date:new Date().toISOString().slice(0,10),count:1,note:''}; show.value=true }
async function save() {
  if (saving.value) return
  if (!form.value.studentName.trim()) return uni.showToast({title:'请输入学生姓名',icon:'none'})
  saving.value=true
  try { await api.post('/checkins',{...form.value,studentId:'s'+Date.now(),count:Number(form.value.count)||1}); list.value.unshift({...form.value,id:String(Date.now())}); show.value=false; uni.showToast({title:'已打卡',icon:'none'}) }
  catch(e) { uni.showToast({title:'失败:'+(e.message||''),icon:'none'}) }
  finally { saving.value=false }
}
function del(c) { uni.showModal({title:'删除',content:c.studentName+' '+c.type,success:async(m)=>{if(!m.confirm)return;try{await api.del('/checkins/'+c.id);list.value=list.value.filter(x=>x.id!==c.id)}catch(e){uni.showToast({title:'失败',icon:'none'})}}}) }
</script>

<style scoped>
.page { padding:24rpx; }
.head { display:flex; align-items:center; justify-content:space-between; margin-bottom:14rpx; }
.h { font-size:36rpx; font-weight:800; color:var(--c-title); }
.add { font-size:28rpx; color:#fff; background:var(--c-primary); padding:12rpx 26rpx; border-radius:40rpx; }
.types { white-space:nowrap; margin-bottom:12rpx; }
.ty { display:inline-block; font-size:24rpx; padding:10rpx 22rpx; border-radius:30rpx; background:var(--c-card2); color:var(--c-sub); margin-right:12rpx; }
.ty.on { background:var(--c-accent); color:#fff; }
.summary { display:flex; gap:10rpx; margin-bottom:14rpx; }
.sc { flex:1; text-align:center; background:var(--c-card); border-radius:14rpx; padding:14rpx 0; }
.sn { display:block; font-size:32rpx; font-weight:800; color:var(--c-accent); }
.sl { font-size:20rpx; color:var(--c-sub); }
.empty { text-align:center; color:var(--c-sub); padding:60rpx 0; }
.list { background:var(--c-card); border-radius:16rpx; padding:10rpx 24rpx; }
.row { display:flex; align-items:center; gap:14rpx; padding:16rpx 0; border-bottom:1px solid var(--c-card2); }
.ic { width:56rpx; height:56rpx; border-radius:14rpx; text-align:center; line-height:56rpx; font-size:28rpx; flex-shrink:0; }
.info { flex:1; }
.nm { display:block; font-size:28rpx; color:var(--c-title); }
.meta { font-size:22rpx; color:var(--c-sub); }
.del { font-size:24rpx; color:var(--c-danger); }
.sheet { margin-top:16rpx; background:var(--c-card); border-radius:20rpx; padding:24rpx; }
.inp { border:1px solid var(--c-border); border-radius:12rpx; padding:16rpx; margin-bottom:14rpx; font-size:28rpx; width:100%; box-sizing:border-box; background:var(--c-card); }
.area { height:100rpx; }
.picker.sm { border:1px solid var(--c-border); border-radius:12rpx; padding:16rpx; margin-bottom:14rpx; font-size:28rpx; background:var(--c-card); }
.ok { background:var(--c-primary); color:#fff; border-radius:50rpx; }
</style>
