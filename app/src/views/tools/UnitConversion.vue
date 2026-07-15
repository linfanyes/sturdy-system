<script setup lang="ts">import { ref, computed } from 'vue';
import { RefreshCw, CheckCircle, RotateCcw } from 'lucide-vue-next';
import ToolPageHeader from '../../components/common/ToolPageHeader.vue';
type UnitType = 'length' | 'weight' | 'time' | 'currency';
interface Question {
 fromUnit: string;
 toUnit: string;
 value: number;
 answer: number;
 factor: number;
}
const unitType = ref<UnitType>('length');
const count = ref(10);
const questions = ref<Question[]>([]);
const userAnswers = ref<(number | null)[]>([]);
const showResults = ref(false);
const unitConfigs: Record<UnitType, {
 units: {
 name: string;
 factor: number;
 }[];
 name: string;
}> = {
 length: {
 name: '长度',
 units: [
 { name: '厘米', factor: 1 },
 { name: '米', factor: 100 },
 { name: '千米', factor: 100000 },
 ],
 },
 weight: {
 name: '重量',
 units: [
 { name: '克', factor: 1 },
 { name: '千克', factor: 1000 },
 { name: '吨', factor: 1000000 },
 ],
 },
 time: {
 name: '时间',
 units: [
 { name: '秒', factor: 1 },
 { name: '分', factor: 60 },
 { name: '时', factor: 3600 },
 ],
 },
 currency: {
 name: '人民币',
 units: [
 { name: '分', factor: 1 },
 { name: '角', factor: 10 },
 { name: '元', factor: 100 },
 ],
 },
};
function gen() {
 const config = unitConfigs[unitType.value];
 const list: Question[] = [];
 for (let i = 0; i < count.value; i++) {
 const fromIndex = Math.floor(Math.random() * config.units.length);
 let toIndex = Math.floor(Math.random() * config.units.length);
 while (toIndex === fromIndex) {
 toIndex = Math.floor(Math.random() * config.units.length);
 }
 const fromUnit = config.units[fromIndex];
 const toUnit = config.units[toIndex];
 const value = Math.floor(Math.random() * 99) + 1;
 const answer = (value * fromUnit.factor) / toUnit.factor;
 list.push({
 fromUnit: fromUnit.name,
 toUnit: toUnit.name,
 value,
 answer: Number(answer.toFixed(2)),
 factor: fromUnit.factor / toUnit.factor,
 });
 }
 questions.value = list;
 userAnswers.value = new Array(count.value).fill(null);
 showResults.value = false;
}
function checkAnswers() {
 showResults.value = true;
}
function reset() {
 gen();
}
const correctCount = computed(() => {
 let count = 0;
 questions.value.forEach((q, i) => {
 if (userAnswers.value[i] !== null && Math.abs(userAnswers.value[i]! - q.answer) < 0.01) {
 count++;
 }
 });
 return count;
});
const accuracy = computed(() => {
 if (questions.value.length === 0)
 return 0;
 return Math.round((correctCount.value / questions.value.length) * 100);
});
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-sky2-50 via-mint-50 to-butter-50 p-4">
    <ToolPageHeader icon="⚖️" title="单位换算练习" description="长度、重量、时间、人民币单位换算" />
    
    <div class="max-w-3xl mx-auto mt-6">
      <div class="bg-white rounded-2xl shadow-soft p-6 mb-6">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-cocoa-600 mb-2">换算类型</label>
            <select
              v-model="unitType"
              class="w-full px-4 py-2 rounded-xl border border-cocoa-200 bg-cocoa-50 focus:outline-none focus:ring-2 focus:ring-sky2-500"
            >
              <option value="length">长度（厘米/米/千米）</option>
              <option value="weight">重量（克/千克/吨）</option>
              <option value="time">时间（秒/分/时）</option>
              <option value="currency">人民币（分/角/元）</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-cocoa-600 mb-2">题目数量</label>
            <select
              v-model="count"
              class="w-full px-4 py-2 rounded-xl border border-cocoa-200 bg-cocoa-50 focus:outline-none focus:ring-2 focus:ring-sky2-500"
            >
              <option :value="5">5 题</option>
              <option :value="10">10 题</option>
              <option :value="20">20 题</option>
            </select>
          </div>
        </div>
        
        <div class="flex gap-3 mt-6">
          <button
            @click="gen"
            class="flex-1 py-3 bg-gradient-to-r from-sky2-500 to-mint-500 text-white rounded-xl font-bold hover:shadow-md transition flex items-center justify-center gap-2"
          >
            <RefreshCw :size="20" />
            生成题目
          </button>
          <button
            v-if="questions.length && !showResults"
            @click="checkAnswers"
            class="px-8 py-3 bg-amber-500 text-white rounded-xl font-bold hover:shadow-md transition flex items-center gap-2"
          >
            <CheckCircle :size="20" />
            提交答案
          </button>
          <button
            v-if="showResults"
            @click="reset"
            class="px-8 py-3 bg-cocoa-100 text-cocoa-600 rounded-xl font-bold hover:bg-cocoa-200 transition flex items-center gap-2"
          >
            <RotateCcw :size="20" />
            重新开始
          </button>
        </div>
      </div>

      <div v-if="questions.length" class="bg-white rounded-2xl shadow-soft p-6">
        <div v-if="showResults" class="flex justify-between items-center mb-6 pb-4 border-b border-cocoa-200">
          <div class="text-lg font-bold text-cocoa-700">
            {{ unitConfigs[unitType].name }}换算练习 - 测试结果
          </div>
          <div class="flex items-center gap-4">
            <span class="text-mint-600 font-bold">正确：{{ correctCount }}/{{ questions.length }}</span>
            <span class="text-amber-600 font-bold">正确率：{{ accuracy }}%</span>
          </div>
        </div>

        <div v-else class="text-center mb-6">
          <h2 class="text-xl font-bold text-cocoa-700">{{ unitConfigs[unitType].name }}换算练习</h2>
          <p class="text-sm text-cocoa-500">请填写正确答案</p>
        </div>

        <div class="space-y-4">
          <div
            v-for="(q, index) in questions"
            :key="index"
            class="flex items-center gap-4 p-4 rounded-xl"
            :class="[
              showResults
                ? userAnswers[index] !== null && Math.abs(userAnswers[index]! - q.answer) < 0.01
                  ? 'bg-mint-50 border border-mint-200'
                  : 'bg-sakura-50 border border-sakura-200'
                : 'bg-cocoa-50'
            ]"
          >
            <span class="w-8 text-cocoa-500 font-bold">{{ index + 1 }}.</span>
            <span class="text-lg font-medium text-cocoa-700">
              {{ q.value }} {{ q.fromUnit }} =
            </span>
            <input
              v-if="!showResults"
              v-model.number="userAnswers[index]"
              type="number"
              step="any"
              class="w-32 text-center text-lg font-bold py-2 border-2 border-cocoa-200 rounded-lg focus:outline-none focus:border-sky2-500"
              placeholder="?"
            />
            <span v-else class="w-32 text-center text-lg font-bold py-2">
              <span
                :class="[
                  userAnswers[index] !== null && Math.abs(userAnswers[index]! - q.answer) < 0.01
                    ? 'text-mint-600'
                    : 'text-sakura-600'
                ]"
              >
                {{ userAnswers[index] ?? '-' }}
              </span>
              <span v-if="userAnswers[index] !== null && Math.abs(userAnswers[index]! - q.answer) >= 0.01" class="text-mint-600 ml-2">
                ({{ q.answer }})
              </span>
            </span>
            <span class="text-lg font-medium text-cocoa-700">{{ q.toUnit }}</span>
          </div>
        </div>
      </div>

      <div class="mt-6 bg-white rounded-xl shadow-softer p-4 text-sm text-cocoa-500">
        <h3 class="font-bold mb-2">使用说明</h3>
        <ul class="list-disc list-inside space-y-1">
          <li>长度换算：1米=100厘米，1千米=1000米</li>
          <li>重量换算：1千克=1000克，1吨=1000千克</li>
          <li>时间换算：1分=60秒，1时=60分</li>
          <li>人民币换算：1角=10分，1元=10角</li>
          <li>点击「提交答案」查看正确答案和正确率</li>
        </ul>
      </div>
    </div>
  </div>
</template>