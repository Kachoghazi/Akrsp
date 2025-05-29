document.getElementById('userImage').addEventListener('click', function(event) {
    event.stopPropagation(); // Prevent click event from bubbling
    const dropdownMenu = document.getElementById('dropdownMenu');
    dropdownMenu.style.display = dropdownMenu.style.display === 'block' ? 'none' : 'block';
  });
  
  // Close the dropdown if clicked outside
  window.addEventListener('click', function() {
    const dropdownMenu = document.getElementById('dropdownMenu');
    dropdownMenu.style.display = 'none';
  });