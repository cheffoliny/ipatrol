<?php

require_once 'custom_view.php';

$str_bg_color = isset($bg_color) ? $bg_color : ' bg-dark ';

?>
<div class="sidebar d-flex flex-column justify-content-between <?= $str_bg_color ?> text-white p-1" style="width: 200px;">
    <div class="overflow-auto" style="height: 90vh;">
        <!-- Панел с аларми -->
        <ul id="alarmPanel" class="list-group h-100 m-0 p-0 <?= $str_bg_color ?> "></ul>
    </div>


    <!-- Контрол за звук -->
<!--    <div class="text-center mb-3">-->
<!--        <button id="toggleSoundBtn" class="btn btn-sm btn-outline-light w-100">-->
<!--            <i class="fa-solid fa-volume-high me-1"></i> Звук: Вкл.-->
<!--        </button>-->
<!--    </div>-->

    <hr class="border-light my-0">
    <ul class="list-group m-0 p-0">

    </ul>

    <!-- Статус на връзката -->


    <div class="text-center py-0 my-0">
        <!-- Button trigger modal -->
        <li id="connStatus" class="text-center my-0 py-1">
              <div class="text-muted small"><i class="fa-solid fa-spinner fa-spin"></i> Проверка...</div>
        </li>
        <!-- Default dropup button -->
        <div class="btn-group dropup w-100 m-0">
            <button type="button" class="btn btn-secondary dropdown-toggle w-100 mx-0" data-bs-toggle="dropdown" aria-expanded="false">
                ИЗБЕРИ ОПЦИЯ
            </button>
            <ul class="dropdown-menu bg-dark w-100">
              <li class="list-group-item d-flex justify-content-between align-items-center bg-primary text-white p-2 " onclick="loadHandAlarm();">
                 <i class="fa-solid fa-circle-plus me-2"></i> Аларма
                 <span class="badge bg-primary rounded-pill"> </span>
             </li>
            <li><hr class="dropdown-divider border-light"></li>
            <div id="unknOpened"  class="list-group m-0 p-0 w-100"></div>
            <li><hr class="dropdown-divider border-light"></li>
            <li type="button" class="btn btn-danger w-100" data-bs-toggle="modal" data-bs-target="#exitModal">
                <i class="fa-solid fa-right-from-bracket me-1"></i> ИЗХОД
            </li>
            </ul>
        </div>
    </div>



        <!-- Modal -->
        <div class="modal fade" id="exitModal" tabindex="-1" aria-labelledby="exitModalLabel" aria-hidden="true">
          <div class="modal-dialog">
            <div class="modal-content">
              <div class="modal-header bg-dark py-1">
                <h1 class="modal-title fs-5" id="exitModalLabel">Потвърдете излизане!</h1>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
              </div>
              <!--<div class="modal-body bg-dark "></div>-->
              <div class="modal-footer bg-dark ">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
                    <i class="fa-solid fa-ban me-1"></i> Откажи
                </button>
                <a href="logout.php" class="btn btn-danger">
                    <i class="fa-solid fa-right-from-bracket me-1"></i> Потвърди
                </a>
              </div>
            </div>
          </div>
        </div>
</div>