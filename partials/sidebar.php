<div class="sidebar d-flex flex-column justify-content-between bg-dark text-white p-1" style="width: 250px;">
    <div style="height: 80vh !important;">

        <!-- Контрол за звук -->
        <div class="text-center mb-3">
            <button id="toggleSoundBtn" class="btn btn-sm btn-outline-light w-100">
                <i class="fa-solid fa-volume-high me-1"></i> Звук: Вкл.
            </button>
        </div>

        <!-- Панел с аларми -->
        <ul id="alarmPanel" class="list-group h-50 m-0 p-0 overflow-auto"></ul>
    </div>
    <hr class="border-light">
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

<!-- Скриптове
<script src="https://code.jquery.com/jquery-3.7.1.min.js"></script>
<script src="scripts/sidebar.js"></script>
<script src="js/alarms.js"></script> -->
