<script setup lang="ts">import { ref, computed } from 'vue';
import { Play, RotateCcw, CheckCircle, RefreshCw } from 'lucide-vue-next';
import ToolPageHeader from '../../components/common/ToolPageHeader.vue';
const mode = ref<'learn' | 'test'>('learn');
const selectedRow = ref<number | null>(null);
const showAll = ref(true);
const testAnswer = ref('');
const currentQuestion = ref<{
 a: number;
 b: number;
 answer: number;
} | null>(null);
const score = ref(0);
const total = ref(0);
const isCorrect = ref<boolean | null>(null);
const table = ref<{
 row: number;
 cols: {
 value: number;
 result: number;
}[];
}[]>([]);
function initTable() {
 const data: typeof table.value = [];
 for (let i = 1; i <= 9; i++) {
 const cols: {
 value: number;
 result: number;
 }[] = [];
 for (let j = 1; j <= 9; j++) {
 cols.push({ value: j, result: i * j });
 }
 data.push({ row: i, cols });
 }
 table.value = data;
}
function toggleRow(row: number) {
 selectedRow.value = selectedRow.value === row ? null : row;
}
function startTest() {
 mode.value = 'test';
 score.value = 0;
 total.value = 0;
 nextQuestion();
}
function nextQuestion() {
 const a = Math.floor(Math.random() * 9) + 1;
 const b = Math.floor(Math.random() * 9) + 1;
 currentQuestion.value = { a, b, answer: a * b };
 testAnswer.value = '';
 isCorrect.value = null;
}
function submitAnswer() {
 if (!testAnswer.value)
 return;
 total.value++;
 const num = parseInt(testAnswer.value);
 isCorrect.value = num === currentQuestion.value?.answer;
 if (isCorrect.value) {
 score.value++;
 }
}
function goToLearn() {
 mode.value = 'learn';
 currentQuestion.value = null;
}
const accuracy = computed(() => {
 if (total.value === 0)
 return 0;
 return Math.round((score.value / total.value) * 100);
});
initTable();
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-butter-50 via-amber-50 to-sakura-50 p-4">
    <ToolPageHeader icon="🔢" title="乘法口诀卡片" description="可视化乘法口诀表，支持学习和测试" />
    
    <div class="max-w-3xl mx-auto mt-6">
      <div class="bg-white rounded-2xl shadow-soft p-6">
        <div class="flex gap-3 mb-6">
          <button
            @click="mode = 'learn'"
            class="flex-1 py-3 rounded-xl font-bold transition"
            :class="[
              mode === 'learn'
                ? 'bg-gradient-to-r from-amber-500 to-butter-500 text-white shadow-md'
                : 'bg-cocoa-100 text-cocoa-600 hover:bg-cocoa-200'
            ]"
          >
            📖 学习模式
          </button>
          <button
            @click="startTest"
            class="flex-1 py-3 rounded-xl font-bold transition"
            :class="[
              mode === 'test'
                ? 'bg-gradient-to-r from-amber-500 to-butter-500 text-white shadow-md'
                : 'bg-cocoa-100 text-cocoa-600 hover:bg-cocoa-200'
            ]"
          >
            ✨ 测试模式
          </button>
        </div>

        <div v-if="mode === 'learn'">
          <div class="flex items-center justify-between mb-4">
            <p class="text-sm text-cocoa-500">点击行号展开/收起</p>
            <button
              @click="showAll = !showAll"
              class="text-sm text-sky2-600 hover:text-sky2-700 flex items-center gap-1"
            >
              <RefreshCw :size="16" />
              {{ showAll ? '收起全部' : '展开全部' }}
            </button>
          </div>
          
          <div class="space-y-2">
            <div
              v-for="row in table"
              :key="row.row"
              class="border border-cocoa-200 rounded-xl overflow-hidden"
            >
              <div
                @click="toggleRow(row.row)"
                class="flex items-center justify-between p-3 bg-gradient-to-r from-amber-100 to-butter-100 cursor-pointer hover:from-amber-200 hover:to-butter-200 transition"
              >
                <span class="font-bold text-amber-700">{{ row.row }} 的乘法口诀</span>
                <span class="text-amber-600">{{ row.row }} × 1 = {{ row.row }}</span>
              </div>
              <div v-if="showAll || selectedRow === row.row" class="p-3 grid grid-cols-9 gap-2">
                <div
                  v-for="col in row.cols"
                  :key="col.value"
                  class="aspect-square rounded-lg bg-cocoa-50 flex flex-col items-center justify-center text-sm"
                  :class="[
                    col.value === 1 || col.value === row.row
                      ? 'bg-amber-100 text-amber-700 font-bold'
                      : 'text-cocoa-600'
                  ]"
                >
                  <span>{{ row.row }}×{{ col.value }}</span>
                  <span class="font-bold">{{ col.result }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div v-else>
          <div class="flex justify-between items-center mb-6">
            <div class="flex items-center gap-4">
              <div class="text-center">
                <div class="text-2xl font-bold text-amber-600">{{ score }}</div>
                <div class="text-xs text-cocoa-500">正确</div>
              </div>
              <div class="text-center">
                <div class="text-2xl font-bold text-cocoa-600">{{ total }}</div>
                <div class="text-xs text-cocoa-500">总数</div>
              </div>
              <div class="text-center">
                <div class="text-2xl font-bold text-mint-600">{{ accuracy }}%</div>
                <div class="text-xs text-cocoa-500">正确率</div>
              </div>
            </div>
            <button
              @click="goToLearn"
              class="px-4 py-2 bg-cocoa-100 text-cocoa-600 rounded-lg hover:bg-cocoa-200 transition"
            >
              返回学习
            </button>
          </div>

          <div v-if="currentQuestion" class="text-center py-12">
            <div class="text-6xl font-bold text-cocoa-700 mb-8">
              {{ currentQuestion.a }} × {{ currentQuestion.b }} = ?
            </div>
            
            <div class="max-w-xs mx-auto mb-6">
              <input
                v-model="testAnswer"
                type="number"
                @keyup.enter="submitAnswer"
                :disabled="isCorrect !== null"
                class="w-full text-center text-4xl font-bold py-4 border-2 border-cocoa-300 rounded-xl focus:outline-none focus:border-sky2-500"
                placeholder="输入答案"
              />
            </div>

            <div v-if="isCorrect === null" class="flex gap-3 justify-center">
              <button
                @click="submitAnswer"
                :disabled="!testAnswer"
                class="px-8 py-3 bg-gradient-to-r from-amber-500 to-butter-500 text-white rounded-xl font-bold hover:shadow-md transition flex items-center gap-2"
                :class="{ 'opacity-50 cursor-not-allowed': !testAnswer }"
              >
                <CheckCircle :size="20" />
                确认答案
              </button>
              <button
                @click="nextQuestion"
                class="px-8 py-3 bg-cocoa-100 text-cocoa-600 rounded-xl font-bold hover:bg-cocoa-200 transition flex items-center gap-2"
              >
                <RotateCcw :size="20" />
                下一题
              </button>
            </div>

            <div v-else class="py-6">
              <div
                class="text-2xl font-bold mb-4"
                :class="isCorrect ? 'text-mint-600' : 'text-sakura-600'"
              >
                {{ isCorrect ? '🎉 答对了！' : '😅 答错了' }}
              </div>
              <div class="text-lg text-cocoa-600 mb-6">
                {{ currentQuestion.a }} × {{ currentQuestion.b }} = <span class="font-bold text-mint-600">{{ currentQuestion.answer }}</span>
              </div>
              <button
                @click="nextQuestion"
                class="px-8 py-3 bg-gradient-to-r from-amber-500 to-butter-500 text-white rounded-xl font-bold hover:shadow-md transition flex items-center gap-2"
              >
                <Play :size="20" />
                继续挑战
              </button>
            </div>
          </div>
        </div>
      </div>

      <div class="mt-6 bg-white rounded-xl shadow-softer p-4 text-sm text-cocoa-500">
        <h3 class="font-bold mb-2">使用说明</h3>
        <ul class="list-disc list-inside space-y-1">
          <li>学习模式：点击行号展开/收起对应行的乘法口诀</li>
          <li>测试模式：随机出题，输入答案后点击确认</li>
          <li>支持回车键提交答案</li>
          <li>实时显示正确率统计</li>
        </ul>
      </div>
    </div>
  </div>
</template>