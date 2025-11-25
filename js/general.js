function showToast(msg, type = "success") {

	let toastEl = document.getElementById('toastMsg');
	let body = toastEl.querySelector('.toast-body');

	body.innerHTML = msg;

	if (type === "error") {
		toastEl.classList.remove('text-bg-dark');
		toastEl.classList.add('text-bg-danger');
	} else {
		toastEl.classList.remove('text-bg-danger');
		toastEl.classList.add('text-bg-dark');
	}

	let toast = new bootstrap.Toast(toastEl);
	toast.show();
}

// Зарежда unknown.php с избрания cityID
// Работи и за динамично заредени елементи
$(document).on('change', '#cities', function () {
	allowAlarmAutoRefresh = false;

	let citieID = this.value;
	//alert(citieID + "ТУК");
	$("#main-content").load('content/unknown.php?citieID=' + citieID);
});

////
//$(document).on('click', '.btn-familiar', function () {
//	let oID = $(this).data('oid');
//	let tVisit = $(this).data('type');
//
//	showConfirmation(oID, tVisit);
//});
//
//function showConfirmation(oID, tVisit) {
//	if (confirm("Сигурни ли сте, че познавате този обект?")) {
//		confirmUnknown(oID, tVisit);
//	}
//}
//function confirmUnknown(oID, tVisit) {
//
//	$.post('api/unknown_confirm.php', {
//		oID: oID,
//		type_visit: tVisit
//	})
//		.done(function (res) {
//
//			if (res.status === "success") {
//
//				let row = $(".object-row-" + oID);
//
//				row.addClass("fade-out");
//
//				setTimeout(() => row.remove(), 400);
//
//				showToast("Обектът е успешно добавен в опознати!");
//
//			} else {
//				showToast("⚠️ Грешка: " + res.message, "error");
//			}
//
//		})
//		.fail(function () {
//			showToast("⚠️ Грешка при заявката към сървъра!", "error");
//		});
//}
// При натискане на бутона
// Натискане на бутон "Познавам"
$(document).on('click', '.btn-familiar', function () {
    let oID = $(this).data('oid');
    let tVisit = $(this).data('type');

    // Запазваме данните в модала
    $('#confirmFamiliarModal').data('oid', oID);
    $('#confirmFamiliarModal').data('type', tVisit);

    // Показваме модала
    let modal = new bootstrap.Modal(document.getElementById('confirmFamiliarModal'));
    modal.show();
});

// Натискане на "Потвърждавам" в модала (dynamic safe)
$(document).on('click', '#confirmFamiliarYes', function () {
    let modal = bootstrap.Modal.getInstance(document.getElementById('confirmFamiliarModal'));

    // Взимаме данните от модала
    let oID = $('#confirmFamiliarModal').data('oid');
    let tVisit = $('#confirmFamiliarModal').data('type');

    // Скриваме модала
    modal.hide();

    // Извикваме същата функция за потвърждение
    confirmUnknown(oID, tVisit);
});

$(document).on('click', '.confirm-familiar-btn', function () {

    let oID = $(this).data('oid');
    let tVisit = $(this).data('type');

    confirmUnknownMap(oID, tVisit);
});


// Оригиналната функция без промяна
function confirmUnknownMap(oID, tVisit) {

    $.post('api/unknown_confirm.php', {
        oID: oID,
        type_visit: tVisit
    })
    .done(function (res) {

        if (res.status === "success") {

            let row = $(".object-row-" + oID);

            row.addClass("fade-out");

            setTimeout(() => row.remove(), 400);

            showToast("Обектът е успешно добавен в опознати!");

        } else {
            showToast("⚠️ Грешка: " + res.message, "error");
        }

    })
    .fail(function () {
        showToast("⚠️ Грешка при заявката към сървъра!", "error");
    });
}

// Функцията за потвърждение на обекта
function confirmUnknown(oID, tVisit) {

    $.post('api/unknown_confirm.php', {
        oID: oID,
        type_visit: tVisit
    })
    .done(function (res) {

        if (res.status === "success") {

            let row = $(".object-row-" + oID);

            row.addClass("fade-out");

            setTimeout(() => row.remove(), 400);

            showToast("Обектът е успешно добавен в опознати!");

        } else {
            showToast("⚠️ Грешка: " + res.message, "error");
        }

    })
    .fail(function () {
        showToast("⚠️ Грешка при заявката към сървъра!", "error");
    });
}


// Ръчни аларми
// === Зареждане на РЪЧНА АЛАРМА ===
function loadHandAlarm() {
    $("#main-content").html('<div class="text-center p-5 text-muted"><i class="fa-solid fa-spinner fa-spin"></i> Зареждане...</div>');

    $.ajax({
        url: "content/hand_alarm.php",
        method: "GET",
        success: function (data) {
            $("#main-content").html(data);
        },
        error: function () {
            $("#main-content").html('<div class="alert alert-danger">Грешка при зареждане на ръчна аларма.</div>');
        }
    });
}


// === AJAX търсене на обекти за ръчна аларма ===
function searchHandAlarm() {
    let num = $("#num_name").val().trim();

    $("#handAlarmResults").html(
        '<div class="text-center p-3 text-muted"><i class="fa-solid fa-spinner fa-spin"></i> Търсене...</div>'
    );

    $.ajax({
        url: "content/hand_alarm_results.php",
        method: "GET",
        data: { num_name: num },
        success: function (data) {
            $("#handAlarmResults").html(data);
        },
        error: function () {
            $("#handAlarmResults").html(
                '<div class="alert alert-danger">Грешка при търсенето.</div>'
            );
        }
    });
}

// --- Избор на аларма ---
function addNewHandAlarm(oID, offID, cName, modalID, btnElement) {

    let btn = $(btnElement); // самият бутон

    $.ajax({
        url: 'api/add_alarm.php',
        method: 'POST',
        data: { oID: oID, offID: offID, cName: cName },
        dataType: 'json',

        success: function (res) {

            if (res.status === 'success') {

                // ✅ 1. Затваряме модала
                $("#" + modalID).modal("hide");

                // ✅ 2. Деактивираме бутона
                btn.prop("disabled", true);

                // ✅ 3. Променяме визуално бутона
                btn.removeClass("btn-danger").addClass("btn-secondary");
                btn.html('<i class="fa-solid fa-circle-check me-2"></i> Добавено');

                // ТОСТ (ти използваш твоя версия)
                showToast("success", "Алармата е добавена успешно!");

            } else {
                showToast("danger", res.msg || "Грешка при добавянето");
            }
        },

        error: function () {
            console.error('Грешка при update на алармата');
            showToast("danger", "Грешка в комуникацията със сървъра!");
        }
    });
}
