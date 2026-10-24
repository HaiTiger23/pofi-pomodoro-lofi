<template>
  <DrawerPanel id="drawer-todo" title="Từng việc nhỏ thôi" icon="ri-task-line" :open="open" @close="closeDrawer">
    <p class="panel-intro">Không cần làm hết mọi thứ.<br />Chọn một việc, rồi bắt đầu.</p>
    <form class="task-form" @submit.prevent="addTask"><div class="task-form-main"><input class="text-field task-input" v-model="newTaskTitle" maxlength="500" placeholder="Việc nhỏ tiếp theo là gì?" aria-label="Tên công việc mới" /><button class="primary-button add-btn" type="submit" aria-label="Thêm công việc"><i class="ri-add-line"></i></button></div><label class="priority-field">Mức ưu tiên<select v-model="newTaskPriority"><option value="low">Thong thả</option><option value="medium">Vừa phải</option><option value="high">Quan trọng</option></select></label></form>
    <div class="filter-row"><div class="filter-tabs" role="group" aria-label="Lọc công việc"><button :class="{ active: filterStatus === 'all' }" :aria-pressed="filterStatus === 'all'" @click="filterStatus = 'all'">Tất cả</button><button :class="{ active: filterStatus === 'active' }" :aria-pressed="filterStatus === 'active'" @click="filterStatus = 'active'">Đang làm</button><button :class="{ active: filterStatus === 'completed' }" :aria-pressed="filterStatus === 'completed'" @click="filterStatus = 'completed'">Đã xong</button></div><button v-if="completedTasks.length" class="text-button" @click="clearCompleted">Dọn đã xong</button></div>
    <p v-if="tasks.length" class="task-stats">{{ completedTasks.length }}/{{ tasks.length }} việc đã hoàn thành. Cứ từng chút một nhé.</p>
    <div v-if="!filteredTasks.length" class="empty-state"><i class="ri-leaf-line"></i><h3>Một khoảng thật nhẹ</h3><p>{{ filterStatus === 'completed' ? 'Những việc hoàn thành sẽ hiện ở đây.' : 'Thêm một việc nhỏ để bắt đầu phiên tập trung.' }}</p></div>
    <div v-else><div class="task-item" :class="{ completed: task.completed }" v-for="task in filteredTasks" :key="task.id"><input type="checkbox" :id="'task-' + task.id" v-model="task.completed" /><div class="task-content"><label :for="'task-' + task.id">{{ task.title }}</label><div class="task-meta"><span class="priority-badge" :class="task.priority">{{ getPriorityText(task.priority) }}</span><time>{{ formatDate(task.createdAt) }}</time></div></div><button class="icon-button danger-button" :aria-label="'Xóa công việc: ' + task.title" @click="removeTask(task.id)"><i class="ri-close-line"></i></button></div></div>
    <template #footer><i class="ri-check-line"></i>Công việc được lưu tự động trên thiết bị.</template>
  </DrawerPanel>
</template>
<script>
import DrawerPanel from './DrawerPanel.vue';
import { ref, computed, watch } from 'vue';
import { getJSON, setJSON } from '../services/storage';
export default {
  components: { DrawerPanel },
  name: 'TodoList',
  props: { open: Boolean },
  emits: ['close'],
  setup(_props, { emit }) {
    const tasks = ref(getJSON('pofi_tasks'));
    const newTaskTitle = ref('');
    const newTaskPriority = ref('medium');
    const filterStatus = ref('all');
    watch(tasks, value => setJSON('pofi_tasks', value), { deep: true });
    const filteredTasks = computed(() => tasks.value.filter(task => filterStatus.value === 'all' || (filterStatus.value === 'completed' ? task.completed : !task.completed)));
    return {
      tasks, newTaskTitle, newTaskPriority, filterStatus, filteredTasks,
      completedTasks: computed(() => tasks.value.filter(task => task.completed)),
      addTask: () => {
        const title = newTaskTitle.value.trim().slice(0, 500);
        if (!title) return;
        tasks.value.unshift({ id: crypto.randomUUID(), title, completed: false, priority: newTaskPriority.value, createdAt: new Date().toISOString() });
        newTaskTitle.value = '';
        newTaskPriority.value = 'medium';
      },
      updateTask: () => {},
      removeTask: id => { tasks.value = tasks.value.filter(task => task.id !== id); },
      clearCompleted: () => { tasks.value = tasks.value.filter(task => !task.completed); },
      getPriorityText: value => ({ high: 'Quan trọng', medium: 'Vừa phải', low: 'Thong thả' }[value] || ''),
      formatDate: value => value ? new Date(value).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }) : '',
      closeDrawer: () => emit('close')
    };
  }
};
</script>
