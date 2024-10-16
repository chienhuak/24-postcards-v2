function toggleSidebar() {
	const sidebar = document.getElementById("mySidebar");
	console.log("檢查 isLogin :",isLogin)
	if (!isLogin) {
		sidebar.style.width = "0";
		return
	}
	if (sidebar.style.width.startsWith("0")) {
		sidebar.style.width = "200px";
	    console.log('sidebar open',sidebar.style.width);
	} else {
		sidebar.style.width = "0";
		console.log('sidebar close',sidebar.style.width);
	}
}

function closeNav() {
	document.getElementById("mySidebar").style.width = "0";
}
