function toggleSidebar() {
	const sidebar = document.getElementById("mySidebar");
	if (sidebar.style.width === "200px") {
	  sidebar.style.width = "0";
	} else {
	  sidebar.style.width = "200px";
	}
}

  function closeNav() {
	document.getElementById("mySidebar").style.width = "0";
}
