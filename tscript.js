document.addEventListener("DOMContentLoaded", function()
{
    var player = document.getElementById("player");
    var speed = 100;

    document.onkeydown = (e) =>
    {
        let posPlayerX = Number(getComputedStyle(player).left.split('px')[0]);
        let posPlayerY = Number(getComputedStyle(player).top.split('px')[0]);

        if (e.keyCode === 38)
        {
            player.style.top = (posPlayerY-speed) + "px";
        }
        else if (e.keyCode === 40)
        {
            player.style.top = (posPlayerY+speed) + "px";
        } 
        else if (e.keyCode === 37)
        {
            player.style.left = (posPlayerX-speed) + "px";
        }
        else if (e.keyCode === 39)
        {
            player.style.left = (posPlayerX+speed) + "px";
        }
    };
});