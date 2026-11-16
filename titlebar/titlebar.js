const $ = id => document.getElementById(id)

$('min').addEventListener('click', () => tb.minimize())
$('max').addEventListener('click', () => tb.toggleMaximize())
$('close').addEventListener('click', () => tb.close())
$('reload').addEventListener('click', () => tb.reload())

tb.onState(s => {
    document.body.classList.toggle('focused', !!s.focused)
    $('icoMax').hidden = s.maximized
    $('icoRestore').hidden = !s.maximized
    $('max').title = s.maximized ? 'Restore' : 'Maximize'
    $('max').setAttribute('aria-label', s.maximized ? 'Restore' : 'Maximize')
})

tb.onTitle(t => {
    $('appName').textContent = t.app || 'Tradely'
    const page = (t.page || '').trim()
    $('pageName').textContent = page
    $('sep').hidden = !page
})
