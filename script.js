document.addEventListener("DOMContentLoaded", function()
{
    const mapel = document.querySelector(".item.mapel")
    const jadwal = document.querySelector(".item.jadwal")
    const tugas = document.querySelector(".item.tugas")

    mapel.addEventListener("mouseover", function()
    {
        mapel.classList.add("act");
    });
    mapel.addEventListener("mouseout", function()
    {
        mapel.classList.remove("act");
    });

    tugas.addEventListener("mouseover", function()
    {
        mapel.classList.add("act");
    });
    tugas.addEventListener("mouseout", function()
    {
        tugas.classList.remove("act");
    });

    jadwal.addEventListener("mouseover", function()
    {
        mapel.classList.add("act");
    });
    jadwal.addEventListener("mouseout", function()
    {
        jadwal.classList.remove("act");
    });
})