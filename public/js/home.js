const errorEl = document.getElementById('error')
const errorText = document.getElementById('error__text')

if (sessionStorage.getItem(key)) {
    sessionStorage.removeItem(key)

    errorEl.classList.remove('d-none')
    errorText.innerText = sessionStorage.getItem(key);
}
