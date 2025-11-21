<div class="sidebar d-flex flex-column justify-content-between bg-dark text-white p-1" style="width: 200px;">
    <div class="h-75 overflow-auto">
        <!-- Панел с аларми -->
        <ul id="alarmPanel" class="list-group h-100 m-0 p-0"></ul>
    </div>


    <!-- Контрол за звук -->
<!--    <div class="text-center mb-3">-->
<!--        <button id="toggleSoundBtn" class="btn btn-sm btn-outline-light w-100">-->
<!--            <i class="fa-solid fa-volume-high me-1"></i> Звук: Вкл.-->
<!--        </button>-->
<!--    </div>-->

    <hr class="border-light my-0">
    <ul class="list-group m-0 p-0">
       <li class="list-group-item d-flex justify-content-between align-items-center bg-primary text-white p-2 mx-1" onclick="loadHandAlarm();">
           <i class="fa-solid fa-circle-plus me-2"></i> Аларма
           <span class="badge bg-primary rounded-pill"> </span>
       </li>
    </ul>

    <!-- Статус на връзката -->
    <ul id="unknOpened"  class="list-group m-0 p-0"></ul>
    <div id="connStatus" class="text-center my-0 py-0">
        <div class="text-muted small"><i class="fa-solid fa-spinner fa-spin"></i> Проверка...</div>
    </div>
    <div class="text-center py-0 my-0">
        <a href="logout.php" class="btn btn-danger w-100">
            <i class="fa-solid fa-right-from-bracket me-1"></i> Изход
        </a>
    </div>
</div>