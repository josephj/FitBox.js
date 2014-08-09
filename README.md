FitBox.js
----------

A JavaScript utility which automatically adjusts font size to fit its container.

## Sample

The original font size is 50px. FitBox.js updates it to 68px which is the maximum font size for this container.

![Sample](http://d.pr/i/ZnN9+)

## Usage

jQuery plugin.

```html
<script src="//ajax.googleapis.com/ajax/libs/jquery/1.11.0/jquery.min.js"></script>
<script src="fit-box.js"></script>
<div class="container">Lorem Ipsum</div>
<script>
$('.container').fitbox('option', {
    minFontSize: '50px',
    maxFontSize: '100px',
    adjustAfterWindowResize: false,
    truncateStyle: 'ellipsis'
});
</script>
```

Create an instance.

```javascript
new FitBox(container, {
    minFontSize: '50px', // Default null
    maxFontSize: '100px', // Default null
    adjustAfterWindowResize: false, // Default false
    truncateStyle: 'ellipsis'
});
```

## License

[MIT License](http://en.wikipedia.org/wiki/MIT_License)
