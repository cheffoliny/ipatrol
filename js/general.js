
function get_cities(cID) {
	var citieID = document.getElementById('cities').value;
	loadXMLDoc('action.php?action=unknown&citieID=' + citieID, 'main', 'unknown');
}

function validateForm(oID, tVisit) {
	loadXMLDoc('action.php?action=unknown_details&confirm=yes&oID=' + oID + '&type_visit=' + tVisit,'main', 'unknown_details' );
	return true;
}

function showConfirmation(oID, tVisit) {
	if (confirm("Сигурни ли сте, че познавате обекта?")) {
		return validateForm(oID, tVisit);
	} else {
		return false;
	}
}
