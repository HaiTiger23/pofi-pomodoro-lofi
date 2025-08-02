import { createStore } from "vuex";

export default createStore({
    state: {
        duration: localStorage.getItem('duration_pomodoro') ?localStorage.getItem('duration_pomodoro') : 45,
        break_duration:localStorage.getItem('break_pomodoro') ?localStorage.getItem('break_pomodoro') : 5,
        // Lịch sử bài hát, lấy từ localStorage hoặc tạo mới nếu chưa có
        songHistory: localStorage.getItem('song_history') ? JSON.parse(localStorage.getItem('song_history')) : [],
        // Danh sách bài hát yêu thích, lấy từ localStorage hoặc tạo mới nếu chưa có
        favoriteSongs: localStorage.getItem('favorite_songs') ? JSON.parse(localStorage.getItem('favorite_songs')) : [],
    },
    mutations: {
        updateDuration(state, duration) {
            state.duration = duration;
            localStorage.setItem('duration_pomodoro', duration);
            
        },
        updateBreakDuration(state, duration) {
            state.break_duration = duration;
            localStorage.setItem('break_pomodoro', duration);
           
        },
        // Thêm bài hát vào lịch sử
        addToHistory(state, song) {
            // Kiểm tra xem bài hát đã có trong lịch sử chưa
            const existingIndex = state.songHistory.findIndex(item => item.videoId === song.videoId);
            
            // Nếu đã có, xóa bỏ bài cũ
            if (existingIndex !== -1) {
                state.songHistory.splice(existingIndex, 1);
            }
            
            // Thêm bài mới vào đầu danh sách
            state.songHistory.unshift(song);
            
            // Giớí hạn chỉ lưu 10 bài gần nhất
            if (state.songHistory.length > 10) {
                state.songHistory.pop(); // Xóa bài cũ nhất (ở cuối mảng)
            }
            
            // Lưu vào localStorage
            localStorage.setItem('song_history', JSON.stringify(state.songHistory));
        },
        // Thêm bài hát vào danh sách yêu thích
        addToFavorites(state, song) {
            // Kiểm tra xem bài hát đã có trong danh sách yêu thích chưa
            const existingIndex = state.favoriteSongs.findIndex(item => item.videoId === song.videoId);
            
            // Nếu đã có, không làm gì
            if (existingIndex !== -1) {
                return;
            }
            
            // Thêm bài mới vào đầu danh sách
            state.favoriteSongs.unshift(song);
            
            // Lưu vào localStorage
            localStorage.setItem('favorite_songs', JSON.stringify(state.favoriteSongs));
        },
        // Xóa bài hát khỏi danh sách yêu thích
        removeFromFavorites(state, videoId) {
            // Tìm và xóa bài hát có videoId tương ứng
            const index = state.favoriteSongs.findIndex(item => item.videoId === videoId);
            if (index !== -1) {
                state.favoriteSongs.splice(index, 1);
                // Lưu vào localStorage
                localStorage.setItem('favorite_songs', JSON.stringify(state.favoriteSongs));
            }
        },
        removeSongFromHistory(state, videoId) {
            // Tìm và xóa bài hát có videoId tương ứng
            const index = state.songHistory.findIndex(item => item.videoId === videoId);
            if (index !== -1) {
                state.songHistory.splice(index, 1);
                // Lưu vào localStorage
                localStorage.setItem('song_history', JSON.stringify(state.songHistory));
            }
        },
        // Kiểm tra xem bài hát có trong danh sách yêu thích không
        toggleFavorite(state, song) {
            // Kiểm tra xem bài hát đã có trong danh sách yêu thích chưa
            const existingIndex = state.favoriteSongs.findIndex(item => item.videoId === song.videoId);
            
            if (existingIndex !== -1) {
                // Nếu đã có, xóa bỏ
                state.favoriteSongs.splice(existingIndex, 1);
            } else {
                // Nếu chưa có, thêm vào
                state.favoriteSongs.unshift(song);
            }
            
            // Lưu vào localStorage
            localStorage.setItem('favorite_songs', JSON.stringify(state.favoriteSongs));
        }
    },
    getters: {
        getDuration(state) {
            return state.duration;
        },
        getBreakDuration(state) {
            return state.break_duration;
        },
        // Lấy danh sách lịch sử bài hát
        getSongHistory(state) {
            return state.songHistory;
        },
        // Lấy danh sách bài hát yêu thích
        getFavoriteSongs(state) {
            return state.favoriteSongs;
        },
        // Kiểm tra xem bài hát có trong danh sách yêu thích không
        isFavorite: (state) => (videoId) => {
            return state.favoriteSongs.some(song => song.videoId === videoId);
        }
    }
})