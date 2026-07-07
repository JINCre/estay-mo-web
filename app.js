(function () {
  function typeEmoji(type) {
    return (type || "").includes("이륜") ? "🛵" : "🚗";
  }

  async function callApi(password, query) {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ password, query }),
    });
    const body = await res.json().catch(() => ({}));
    return { status: res.status, body };
  }

  // --- 비밀번호 게이트 ---

  const gateEl = document.getElementById("gate");
  const appEl = document.getElementById("app");
  const gateForm = document.getElementById("gate-form");
  const gateInput = document.getElementById("gate-input");
  const gateError = document.getElementById("gate-error");

  async function checkPassword(input) {
    gateError.textContent = "";
    try {
      const { status, body } = await callApi(input, "");
      if (status === 200 && body.status === "ok") {
        sessionStorage.setItem("gate-password", input);
        enterApp();
      } else if (status === 401) {
        gateError.textContent = "비밀번호가 올바르지 않습니다.";
      } else if (status === 429) {
        gateError.textContent = "잠시 후 다시 시도해주세요.";
      } else {
        gateError.textContent = "확인 정보를 불러오지 못했습니다. 다시 시도해주세요.";
      }
    } catch (e) {
      gateError.textContent = "확인 정보를 불러오지 못했습니다. 다시 시도해주세요.";
    }
  }

  gateForm.addEventListener("submit", (e) => {
    e.preventDefault();
    checkPassword(gateInput.value.trim());
  });

  function enterApp() {
    gateEl.hidden = true;
    appEl.hidden = false;
  }

  function backToGate() {
    sessionStorage.removeItem("gate-password");
    appEl.hidden = true;
    gateEl.hidden = false;
  }

  // --- 탭 전환 ---

  const tabButtons = document.querySelectorAll(".tab-btn");
  const tabPanels = {
    search: document.getElementById("tab-search"),
    status: document.getElementById("tab-status"),
  };

  tabButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      tabButtons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      Object.entries(tabPanels).forEach(([key, panel]) => {
        panel.hidden = key !== btn.dataset.tab;
      });
    });
  });

  // --- 검색 탭 ---

  const searchForm = document.getElementById("search-form");
  const plateInput = document.getElementById("plate-input");
  const searchResult = document.getElementById("search-result");
  const searchLoadError = document.getElementById("search-load-error");

  searchForm.addEventListener("submit", (e) => {
    e.preventDefault();
    renderSearchResult(plateInput.value.trim());
  });

  async function renderSearchResult(query) {
    searchLoadError.textContent = "";
    searchResult.innerHTML = "";
    if (!query) return;

    const password = sessionStorage.getItem("gate-password") || "";

    let status, body;
    try {
      ({ status, body } = await callApi(password, query));
    } catch (e) {
      searchLoadError.textContent = "차량 정보를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.";
      return;
    }

    if (status === 401) {
      backToGate();
      return;
    }
    if (status === 429) {
      searchLoadError.textContent = "잠시 후 다시 시도해주세요.";
      return;
    }
    if (status !== 200) {
      searchLoadError.textContent = "차량 정보를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.";
      return;
    }

    if (body.status === "one") {
      searchResult.innerHTML = `<p class="result-ok">${body.dong}동 ${body.ho}호 주민의 ${typeEmoji(body.type)} 입니다.</p>`;
      return;
    }

    if (body.status === "many") {
      const lines = body.results
        .map((v) => `<li>${v.dong}동 ${v.ho}호 ${typeEmoji(v.type)}</li>`)
        .join("");
      searchResult.innerHTML = `<p class="result-ok">여러 대가 검색되었습니다:</p><ul class="result-list">${lines}</ul>`;
      return;
    }

    searchResult.innerHTML = `
      <p class="result-none">등록되지 않은 차량입니다.<br>방문차량인지 미등록 차량인지 채팅방에서 확인해주세요.</p>
      <a class="chat-link-btn" href="#" hidden>채팅방 바로가기</a>
    `;
  }

  // --- 시작 ---

  if (sessionStorage.getItem("gate-password")) {
    enterApp();
  }
})();
