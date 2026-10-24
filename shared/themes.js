const THEMES = [
  { id: 'warm', name: 'Góc ấm', subtitle: 'Kem · nâu · xanh sage', icon: 'ri-cup-line', image: '/themes/warm.webp', caption: 'Ngoài kia mưa rơi.', detail: 'Ở đây, mình cứ chậm rãi tập trung.', colors: ['#d6ad79', '#343b31', '#ede0cd'] },
  { id: 'night', name: 'Đêm mơ', subtitle: 'Tím khói · xanh midnight', icon: 'ri-moon-line', image: '/themes/night.webp', caption: 'Một đêm thật êm.', detail: 'Cho những ý tưởng còn đang thức.', colors: ['#b8a5df', '#202738', '#e5def2'] },
  { id: 'garden', name: 'Vườn sớm', subtitle: 'Kem sáng · xanh thiên nhiên', icon: 'ri-leaf-line', image: '/themes/garden.webp', caption: 'Hít một hơi thật sâu.', detail: 'Bắt đầu ngày mới, nhẹ nhàng thôi.', colors: ['#60765b', '#e8e4d5', '#faf7ed'] }
];
const BACKGROUNDS = [
  { id: 'scene', name: 'Ảnh lofi', icon: 'ri-image-line' },
  { id: 'youtube', name: 'YouTube mờ', icon: 'ri-blur-off-line' },
  { id: 'video', name: 'Video', icon: 'ri-youtube-line' }
];
module.exports = { THEMES, BACKGROUNDS, isTheme: value => THEMES.some(theme => theme.id === value) };
