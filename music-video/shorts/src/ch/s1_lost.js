(() => {
  const poses = ['stand','sing','spin','reach','walk','kneel'];
  function test(t, lt) {
    skyFill([[0,'#FF9AB0'],[1,'#3D6BFF']]);
    const i = Math.floor(t) % 6;
    heroine(300, 900, 0.8, { t, view: 'back', pose: poses[i], hair: '#6B4A3A', rim: '#FFFFFF', outfit: 'dance', wind: 0.5 });
    heroine(800, 900, 0.8, { t, view: 'side', pose: poses[i], hair: '#5B8CFF', rim: '#FFFFFF', wind: 0.5 });
    heroine(300, 1800, 0.8, { t, view: 'front', pose: poses[i], hair: '#7ED321', rim: '#FFFFFF', wind: 0.5 });
    brother(800, 1800, 0.8, { t });
    letter(poses[i], 540, 100, 80, '#fff');
  }
  chapter('lost', 0, 14.55, [[0, test]]);
})();
