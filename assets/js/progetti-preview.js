(() => {
  const params = new URLSearchParams(window.location.search);
  if (params.get('theme') === 'dark') document.documentElement.dataset.reviewTheme = 'dark';
})();
