    // Toggle deskripsi
    document.querySelectorAll('.desc-btn').forEach((btn, i) => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation(); // supaya gak buka/tutup card
          const descBox = btn.closest('li').nextElementSibling;
          descBox.classList.toggle('hidden');
        });
      });

