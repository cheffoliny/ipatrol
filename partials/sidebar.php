<div class="sidebar d-flex flex-column justify-content-between bg-dark text-white p-1" style="width: 200px;">
    <div class="h-75 overflow-auto">
        <!-- Панел с аларми -->
        <ul id="alarmPanel" class="list-group h-100 m-0 p-0"></ul>
    </div>
    <hr class="border-light">

    <!-- Контрол за звук -->
<!--    <div class="text-center mb-3">-->
<!--        <button id="toggleSoundBtn" class="btn btn-sm btn-outline-light w-100">-->
<!--            <i class="fa-solid fa-volume-high me-1"></i> Звук: Вкл.-->
<!--        </button>-->
<!--    </div>-->

    <!-- Статус на връзката -->
    <div id="connStatus" class="text-center my-3">
        <div class="text-muted small"><i class="fa-solid fa-spinner fa-spin"></i> Проверка...</div>
    </div>
    <div class="text-center">
        <a href="logout.php" class="btn btn-danger w-100 mt-3">
            <i class="fa-solid fa-right-from-bracket me-1"></i> Изход
        </a>
    </div>
</div>