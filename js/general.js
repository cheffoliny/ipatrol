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

//
$(document).on('click', '.btn-familiar', function () {
	let oID = $(this).data('oid');
	let tVisit = $(this).data('type');

	showConfirmation(oID, tVisit);
});

function showConfirmation(oID, tVisit) {
	if (confirm("Сигурни ли сте, че познавате този обект?")) {
		confirmUnknown(oID, tVisit);
	}
}
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
