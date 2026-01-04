const starship = document.getElementById('starship');
const elon = document.getElementById('elon');
const bar = document.getElementById('progress-bar');
const btn = document.getElementById('home-btn');

// 스타쉽 클릭 시 상승 및 게이지바 시작
starship.addEventListener('click', () => {
  starship.style.bottom = '120%';
  startProgressBar(); // 클릭 시 게이지바 바로 시작
  setTimeout(() => elonDropFromStarship(), 3200);
});

// 스타쉽 사라진 후 일론 하강
function elonDropFromStarship() {
  const rect = starship.getBoundingClientRect();
  const x = rect.left;
  const topY = rect.top;
  starship.style.display = 'none';

  elon.style.display = 'block';
  elon.style.left = (x - 200) + 'px';
  elon.style.top = topY + 'px';

  requestAnimationFrame(() => {
    elon.style.top = '10%';
  });

  elon.addEventListener('transitionend', function onDrop(e) {
    if (e.propertyName !== 'top') return;
    elon.removeEventListener('transitionend', onDrop);
    moveElonToMars();
  }, { once: true });
}

// 일론이 화성으로 이동
function moveElonToMars() {
  const mars = document.getElementById('mars');
  const marsRect = mars.getBoundingClientRect();
  const marsX = marsRect.left + marsRect.width / 2;
  const marsY = marsRect.top + marsRect.height / 2;

  elon.style.transition = 'left 4s ease-in-out, top 4s ease-in-out';
  elon.style.left = (marsX - elon.offsetWidth / 2) + 'px';
  elon.style.top  = (marsY - elon.offsetHeight / 2) + 'px';

  elon.addEventListener('transitionend', function onArrive(e) {
    if (e.propertyName !== 'left') return;
    elon.removeEventListener('transitionend', onArrive);
    btn.style.display = 'block';
  }, { once: true });
}

// 게이지바
function startProgressBar() {
  let progress = 0;
  function animate() {
    progress += 0.18;
    bar.style.width = progress + '%';
    if (progress < 100) {
      requestAnimationFrame(animate);
    }
  }
  requestAnimationFrame(animate);
}

// 메인 화면으로 이동
btn.addEventListener('click', () => {
  window.location.href = 'index.html';
});
