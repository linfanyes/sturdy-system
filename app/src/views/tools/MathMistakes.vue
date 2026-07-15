<script setup lang="ts">import { ref, computed } from 'vue';
import { Plus, Edit2, Trash2, BookOpen, RotateCcw } from 'lucide-vue-next';
import ToolPageHeader from '../../components/common/ToolPageHeader.vue';
import Modal from '../../components/common/Modal.vue';
interface Mistake {
 id: string;
 question: string;
 wrongAnswer: string;
 correctAnswer: string;
 reason: string;
 category: string;
 date: string;
}
const mistakes = ref<Mistake[]>([]);
const categories = ['进位加法', '退位减法', '乘法口诀', '除法', '单位换算', '应用题', '其他'];
const showAddModal = ref(false);
const showEditModal = ref(false);
const editingId = ref<string | null>(null);
const filterCategory = ref('all');
const newMistake = ref({
 question: '',
 wrongAnswer: '',
 correctAnswer: '',
 reason: '',
 category: categories[0],
});
function loadMistakes() {
 const stored = localStorage.getItem('math_mistakes');
 if (stored) {
 mistakes.value = JSON.parse(stored);
 }
}
function saveMistakes() {
 localStorage.setItem('math_mistakes', JSON.stringify(mistakes.value));
}
function addMistake() {
 if (!newMistake.value.question || !newMistake.value.correctAnswer) {
 alert('请填写题目和正确答案');
 return;
 }
 mistakes.value.unshift({
 id: Date.now().toString(),
 ...newMistake.value,
 date: new Date().toISOString().slice(0, 10),
 });
 saveMistakes();
 resetForm();
 showAddModal.value = false;
}
function editMistake(id: string) {
 const mistake = mistakes.value.find((m) => m.id === id);
 if (mistake) {
 editingId.value = id;
 newMistake.value = {
 question: mistake.question,
 wrongAnswer: mistake.wrongAnswer,
 correctAnswer: mistake.correctAnswer,
 reason: mistake.reason,
 category: mistake.category,
 };
 showEditModal.value = true;
 }
}
function updateMistake() {
 if (!editingId.value)
 return;
 const index = mistakes.value.findIndex((m) => m.id === editingId.value);
 if (index !== -1) {
 mistakes.value[index] = {
 ...mistakes.value[index],
 ...newMistake.value,
 };
 saveMistakes();
 }
 resetForm();
 editingId.value = null;
 showEditModal.value = false;
}
function deleteMistake(id: string) {
 if (!confirm('确定删除这条错题记录？'))
 return;
 mistakes.value = mistakes.value.filter((m) => m.id !== id);
 saveMistakes();
}
function resetForm() {
 newMistake.value = {
 question: '',
 wrongAnswer: '',
 correctAnswer: '',
 reason: '',
 category: categories[0],
 };
}
function generatePractice() {
 if (filteredMistakes.value.length === 0) {
 alert('没有错题可练习');
 return;
 }
 const questions = filteredMistakes.value.map((m) => ({
 question: m.question,
 answer: m.correctAnswer,
 }));
 const text = questions.map((q, i) => `${i + 1}. ${q.question} = ${q.answer}`).join('\n');
 const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
 const url = URL.createObjectURL(blob);
 const a = document.createElement('a');
 a.href = url;
 a.download = '错题练习.txt';
 a.click();
 URL.revokeObjectURL(url);
}
const filteredMistakes = computed(() => {
 if (filterCategory.value === 'all') {
 return mistakes.value;
 }
 return mistakes.value.filter((m) => m.category === filterCategory.value);
});
const categoryStats = computed(() => {
 const stats: Record<string, number> = {};
 categories.forEach((c) => {
 stats[c] = mistakes.value.filter((m) => m.category === c).length;
 });
 return stats;
});
loadMistakes();
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-sakura-50 via-butter-50 to-amber-50 p-4">
    <ToolPageHeader icon="📝" title="数学错题本" description="记录学生做错的题目，方便针对性复习" />
    
    <div class="max-w-4xl mx-auto mt-6">
      <div class="bg-white rounded-2xl shadow-soft p-6 mb-6">
        <div class="flex flex-wrap gap-3 mb-4">
          <button
            @click="showAddModal = true"
            class="px-6 py-2 bg-gradient-to-r from-sakura-500 to-butter-500 text-white rounded-xl font-bold hover:shadow-md transition flex items-center gap-2"
          >
            <Plus :size="20" />
            添加错题
          </button>
          <button
            @click="generatePractice"
            :disabled="filteredMistakes.length === 0"
            class="px-6 py-2 bg-cocoa-100 text-cocoa-600 rounded-xl font-bold hover:bg-cocoa-200 transition flex items-center gap-2"
            :class="{ 'opacity-50 cursor-not-allowed': filteredMistakes.length === 0 }"
          >
            <BookOpen :size="20" />
            生成练习卷
          </button>
        </div>

        <div class="flex flex-wrap gap-2">
          <button
            @click="filterCategory = 'all'"
            class="px-3 py-1 rounded-lg text-sm transition"
            :class="[
              filterCategory === 'all'
                ? 'bg-sky2-500 text-white'
                : 'bg-cocoa-100 text-cocoa-600 hover:bg-cocoa-200'
            ]"
          >
            全部 ({{ mistakes.length }})
          </button>
          <button
            v-for="cat in categories"
            :key="cat"
            @click="filterCategory = cat"
            class="px-3 py-1 rounded-lg text-sm transition"
            :class="[
              filterCategory === cat
                ? 'bg-sky2-500 text-white'
                : 'bg-cocoa-100 text-cocoa-600 hover:bg-cocoa-200'
            ]"
          >
            {{ cat }} ({{ categoryStats[cat] }})
          </button>
        </div>
      </div>

      <div v-if="filteredMistakes.length > 0" class="space-y-4">
        <div
          v-for="mistake in filteredMistakes"
          :key="mistake.id"
          class="bg-white rounded-xl shadow-soft p-4"
        >
          <div class="flex items-start justify-between mb-2">
            <span class="px-2 py-1 bg-amber-100 text-amber-700 text-xs rounded-lg">
              {{ mistake.category }}
            </span>
            <span class="text-xs text-cocoa-400">{{ mistake.date }}</span>
          </div>
          <div class="text-lg font-medium text-cocoa-700 mb-2">
            {{ mistake.question }} = ?
          </div>
          <div class="flex gap-4 text-sm">
            <div class="flex items-center gap-2">
              <span class="text-cocoa-500">我的答案：</span>
              <span class="text-sakura-600 font-bold">{{ mistake.wrongAnswer || '未填写' }}</span>
            </div>
            <div class="flex items-center gap-2">
              <span class="text-cocoa-500">正确答案：</span>
              <span class="text-mint-600 font-bold">{{ mistake.correctAnswer }}</span>
            </div>
          </div>
          <div v-if="mistake.reason" class="mt-2 text-sm text-cocoa-500">
            <span class="font-medium">错误原因：</span>{{ mistake.reason }}
          </div>
          <div class="flex gap-2 mt-4">
            <button
              @click="editMistake(mistake.id)"
              class="px-3 py-1 bg-cocoa-100 text-cocoa-600 rounded-lg text-sm hover:bg-cocoa-200 transition flex items-center gap-1"
            >
              <Edit2 :size="14" />
              编辑
            </button>
            <button
              @click="deleteMistake(mistake.id)"
              class="px-3 py-1 bg-sakura-100 text-sakura-600 rounded-lg text-sm hover:bg-sakura-200 transition flex items-center gap-1"
            >
              <Trash2 :size="14" />
              删除
            </button>
          </div>
        </div>
      </div>

      <div v-else class="bg-white rounded-xl shadow-soft p-12 text-center">
        <div class="text-6xl mb-4">📝</div>
        <p class="text-cocoa-500 mb-4">还没有错题记录</p>
        <button
          @click="showAddModal = true"
          class="px-6 py-2 bg-gradient-to-r from-sakura-500 to-butter-500 text-white rounded-xl font-bold hover:shadow-md transition"
        >
          添加第一条错题
        </button>
      </div>
    </div>

    <Modal
      :open="showAddModal || showEditModal"
      :title="editingId ? '编辑错题' : '添加错题'"
      @close="showAddModal = false; showEditModal = false; resetForm(); editingId = null;"
    >
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-cocoa-600 mb-1">题目</label>
          <textarea
            v-model="newMistake.question"
            class="w-full p-3 border border-cocoa-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky2-500"
            rows="3"
            placeholder="例如：25 + 18 ="
          ></textarea>
        </div>
        <div>
          <label class="block text-sm font-medium text-cocoa-600 mb-1">我的答案</label>
          <input
            v-model="newMistake.wrongAnswer"
            type="text"
            class="w-full p-3 border border-cocoa-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky2-500"
            placeholder="例如：33"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-cocoa-600 mb-1">正确答案</label>
          <input
            v-model="newMistake.correctAnswer"
            type="text"
            class="w-full p-3 border border-cocoa-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky2-500"
            placeholder="例如：43"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-cocoa-600 mb-1">错误原因</label>
          <input
            v-model="newMistake.reason"
            type="text"
            class="w-full p-3 border border-cocoa-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky2-500"
            placeholder="例如：忘记进位"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-cocoa-600 mb-1">分类</label>
          <select
            v-model="newMistake.category"
            class="w-full p-3 border border-cocoa-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky2-500"
          >
            <option v-for="cat in categories" :key="cat" :value="cat">
              {{ cat }}
            </option>
          </select>
        </div>
        <div class="flex gap-3 mt-6">
          <button
            @click="showAddModal = false; showEditModal = false; resetForm(); editingId = null;"
            class="flex-1 py-2 bg-cocoa-100 text-cocoa-600 rounded-lg font-medium hover:bg-cocoa-200 transition"
          >
            取消
          </button>
          <button
            @click="editingId ? updateMistake() : addMistake()"
            class="flex-1 py-2 bg-gradient-to-r from-sakura-500 to-butter-500 text-white rounded-lg font-medium hover:shadow-md transition"
          >
            {{ editingId ? '保存修改' : '添加错题' }}
          </button>
        </div>
      </div>
    </Modal>
  </div>
</template>