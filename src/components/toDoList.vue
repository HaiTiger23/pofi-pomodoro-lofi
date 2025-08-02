<template>
  <!-- Drawer component cho danh sách công việc -->
  <div 
    id="drawer-todo"
    class="fixed top-0 right-0 z-40 h-screen p-4 overflow-y-auto transition-transform translate-x-full bg-white w-96 dark:bg-gray-800"
    tabindex="-1"
    aria-labelledby="drawer-todo-label"
  >
    <div class="flex justify-between items-center mb-4">
      <h5 class="text-base font-semibold text-gray-500 uppercase dark:text-gray-400 flex items-center">
        <i class="ri-task-line mr-2 text-blue-500"></i>
        Danh sách công việc
      </h5>
      <button
        type="button"
        @click="closeDrawer"
        class="text-gray-400 bg-transparent hover:bg-gray-200 hover:text-gray-900 rounded-lg text-sm p-1.5 inline-flex items-center dark:hover:bg-gray-600 dark:hover:text-white"
      >
        <svg
          aria-hidden="true"
          class="w-5 h-5"
          fill="currentColor"
          viewBox="0 0 20 20"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            fill-rule="evenodd"
            d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
            clip-rule="evenodd"
          ></path>
        </svg>
        <span class="sr-only">Close Todo List</span>
      </button>
    </div>
    
    <!-- Form thêm công việc mới -->
    <div class="add-task-form mb-4">
      <div class="flex">
        <input 
          v-model="newTaskTitle" 
          placeholder="Thêm công việc mới..." 
          class="task-input flex-1 bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500" 
          @keyup.enter="addTask"
        >
        <button 
          @click="addTask" 
          class="add-btn ml-2 text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm p-2.5 text-center inline-flex items-center dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800"
        >
          <i class="ri-add-line"></i>
        </button>
      </div>
      <div class="mt-2 flex items-center">
        <select 
          v-model="newTaskPriority" 
          class="priority-select bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
        >
          <option value="low">Thấp</option>
          <option value="medium">Trung bình</option>
          <option value="high">Cao</option>
        </select>

      </div>
    </div>
    
    <!-- Bộ lọc -->
    <div class="filter-section mb-4">
      <div class="flex justify-between items-center">
        <div class="flex space-x-2">
          <button 
            @click="filterStatus = 'all'" 
            :class="{'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300': filterStatus === 'all', 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300': filterStatus !== 'all'}"
            class="px-3 py-1 text-xs font-medium rounded-full"
          >
            Tất cả
          </button>
          <button 
            @click="filterStatus = 'active'" 
            :class="{'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300': filterStatus === 'active', 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300': filterStatus !== 'active'}"
            class="px-3 py-1 text-xs font-medium rounded-full"
          >
            Đang làm
          </button>
          <button 
            @click="filterStatus = 'completed'" 
            :class="{'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300': filterStatus === 'completed', 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300': filterStatus !== 'completed'}"
            class="px-3 py-1 text-xs font-medium rounded-full"
          >
            Hoàn thành
          </button>
        </div>
        <button 
          v-if="completedTasks.length > 0" 
          @click="clearCompleted" 
          class="text-xs text-red-600 dark:text-red-500 hover:underline"
        >
          Xóa đã hoàn thành
        </button>
      </div>
    </div>
    
    <!-- Danh sách công việc -->
    <div class="todo-list">
      <div v-if="filteredTasks.length === 0" class="empty-todo">
        <p class="text-center text-gray-500 dark:text-gray-400 py-4">Chưa có công việc nào</p>
      </div>
      
      <div v-else class="task-items space-y-2">
        <div 
          v-for="(task) in filteredTasks" 
          :key="task.id" 
          class="task-item p-3 rounded-lg transition-all duration-200"
          :class="{
            'bg-gray-50 dark:bg-gray-700': !task.completed,
            'bg-gray-100 dark:bg-gray-600': task.completed,
            'border-l-4 border-red-500': task.priority === 'high',
            'border-l-4 border-yellow-500': task.priority === 'medium',
            'border-l-4 border-green-500': task.priority === 'low'
          }"
        >
          <div class="flex items-start">
            <div class="flex-shrink-0">
              <input 
                type="checkbox" 
                :id="'task-' + task.id" 
                v-model="task.completed"
                @change="updateTask(task)"
                class="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
              >
            </div>
            <div class="ml-3 flex-1">
              <label 
                :for="'task-' + task.id" 
                class="text-sm font-medium transition-all duration-200"
                :class="{
                  'text-gray-900 dark:text-white': !task.completed,
                  'text-gray-500 dark:text-gray-400 line-through': task.completed
                }"
              >
                {{ task.title }}
              </label>
              <div class="flex items-center mt-1 text-xs">
                <span 
                  class="priority-badge px-2 py-0.5 rounded-full mr-2"
                  :class="{
                    'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300': task.priority === 'high',
                    'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300': task.priority === 'medium',
                    'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300': task.priority === 'low'
                  }"
                >
                  {{ getPriorityText(task.priority) }}
                </span>
                <span class="text-gray-500 dark:text-gray-400">
                  {{ formatDate(task.createdAt) }}
                </span>
              </div>
            </div>
            <div class="flex-shrink-0 ml-2">
              <button 
                @click.stop="removeTask(task.id)"
                class="text-red-500 hover:text-red-700 dark:hover:text-red-400"
                title="Xóa công việc"
              >
                <i class="ri-delete-bin-line"></i>
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';

export default {
  name: 'TodoList',
  setup() {
    // State
    const tasks = ref([]);
    const newTaskTitle = ref('');
    const newTaskPriority = ref('medium');
    const filterStatus = ref('all');
    const isVisible = ref(false);
    
    // Load tasks from localStorage
    onMounted(() => {
      const savedTasks = localStorage.getItem('pofi_tasks');
      if (savedTasks) {
        tasks.value = JSON.parse(savedTasks);
      }
      
      // Đăng ký sự kiện toggle-todo từ App.vue
      window.addEventListener('toggle-todo', handleToggleTodo);
    });
    
    // Hủy đăng ký sự kiện khi component bị unmount
    onUnmounted(() => {
      window.removeEventListener('toggle-todo', handleToggleTodo);
    });
    
    // Save tasks to localStorage whenever it changes
    watch(tasks, (newTasks) => {
      localStorage.setItem('pofi_tasks', JSON.stringify(newTasks));
    }, { deep: true });
    
    // Computed properties
    const filteredTasks = computed(() => {
      if (filterStatus.value === 'all') {
        return tasks.value;
      } else if (filterStatus.value === 'active') {
        return tasks.value.filter(task => !task.completed);
      } else if (filterStatus.value === 'completed') {
        return tasks.value.filter(task => task.completed);
      }
      return tasks.value;
    });
    
    const completedTasks = computed(() => {
      return tasks.value.filter(task => task.completed);
    });
    
    // Methods
    const addTask = () => {
      if (newTaskTitle.value.trim() === '') return;
      
      const newTask = {
        id: Date.now(),
        title: newTaskTitle.value.trim(),
        completed: false,
        priority: newTaskPriority.value,
        createdAt: new Date()
      };
      
      tasks.value.unshift(newTask);
      newTaskTitle.value = '';
      newTaskPriority.value = 'medium';
    };
    
    const updateTask = (task) => {
      const index = tasks.value.findIndex(t => t.id === task.id);
      if (index !== -1) {
        tasks.value[index] = { ...task };
      }
    };
    
    const removeTask = (taskId) => {
      tasks.value = tasks.value.filter(task => task.id !== taskId);
    };
    
    const clearCompleted = () => {
      tasks.value = tasks.value.filter(task => !task.completed);
    };
    
    const getPriorityText = (priority) => {
      switch (priority) {
        case 'high': return 'Cao';
        case 'medium': return 'Trung bình';
        case 'low': return 'Thấp';
        default: return '';
      }
    };
    
    const formatDate = (date) => {
      if (!date) return '';
      const d = new Date(date);
      return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
    };
    
    // Xử lý sự kiện toggle-todo từ App.vue
    const handleToggleTodo = (event) => {
      const drawer = document.getElementById('drawer-todo');
      if (drawer) {
        if (event.detail.show) {
          drawer.classList.remove('translate-x-full');
          drawer.classList.add('transform-none');
          isVisible.value = true;
        } else {
          drawer.classList.add('translate-x-full');
          drawer.classList.remove('transform-none');
          isVisible.value = false;
        }
      }
    };
    
    // Đóng drawer
    const closeDrawer = () => {
      const drawer = document.getElementById('drawer-todo');
      if (drawer) {
        drawer.classList.add('translate-x-full');
        drawer.classList.remove('transform-none');
        
        // Thông báo cho App.vue biết drawer đã đóng
        window.dispatchEvent(new CustomEvent('todo-closed'));
        isVisible.value = false;
      }
    };
    
    return {
      tasks,
      newTaskTitle,
      newTaskPriority,
      filterStatus,
      filteredTasks,
      completedTasks,
      isVisible,
      addTask,
      updateTask,
      removeTask,
      clearCompleted,
      getPriorityText,
      formatDate,
      closeDrawer
    };
  }
};
</script>

<style scoped>
/* Style cho drawer todo */
.task-item {
  position: relative;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.task-item:hover {
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.empty-todo {
  border: 2px dashed rgba(156, 163, 175, 0.2);
  border-radius: 0.5rem;
}

.add-task-form {
  background-color: rgba(59, 130, 246, 0.05);
  padding: 1rem;
  border-radius: 0.5rem;
}

/* Animate checkbox */
input[type="checkbox"] {
  transition: all 0.2s;
}

input[type="checkbox"]:checked {
  transform: scale(1.1);
}
</style>