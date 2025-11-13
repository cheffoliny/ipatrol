<div class="sidebar d-flex flex-column justify-content-between bg-dark text-white" style="width: 250px; padding: 1rem;">
    <div>
        <h4 class="mb-3"><i class="fa-solid fa-shield-halved me-2"></i> iPatrol</h4>
        <hr class="border-light">

        <!-- Статус на връзката -->
        <div id="connStatus" class="text-center my-3">
            <div class="text-muted small"><i class="fa-solid fa-spinner fa-spin"></i> Проверка...</div>
        </div>

        <!-- Контрол за звук -->
        <div class="text-center mb-3">
            <button id="toggleSoundBtn" class="btn btn-sm btn-outline-light w-100">
                <i class="fa-solid fa-volume-high me-1"></i> Звук: Вкл.
            </button>
        </div>

        <!-- Панел с аларми -->
        <ul id="alarmPanel" class="list-group h-50 m-0 p-0 overflow-auto"></ul>
    </div>

    <div class="text-center fixed-bottom">
        <a href="logout.php" class="btn btn-danger w-100 mt-3">
            <i class="fa-solid fa-right-from-bracket me-1"></i> Изход
        </a>
    </div>
</div>

<!-- Скриптове
<script src="https://code.jquery.com/jquery-3.7.1.min.js"></script>
<script src="scripts/sidebar.js"></script>
<script src="js/alarms.js"></script> -->
