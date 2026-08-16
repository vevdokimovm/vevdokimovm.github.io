// Визитка. Кода здесь ровно столько, сколько нужно, чтобы собрать страницу
// из data/profile.json. Всё содержание живёт в данных: правка текста резюме
// не должна требовать открывать этот файл.

(function () {
  "use strict";

  var state = { data: null, lang: "ru", role: "backend" };

  // --- мелкие помощники ------------------------------------------------------

  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    attrs = attrs || {};
    Object.keys(attrs).forEach(function (key) {
      var value = attrs[key];
      if (value === null || value === undefined || value === false) return;
      if (key === "class") node.className = value;
      else if (key === "text") node.textContent = value;
      else if (key.indexOf("on") === 0) node.addEventListener(key.slice(2).toLowerCase(), value);
      else node.setAttribute(key, value);
    });
    [].concat(children || []).forEach(function (child) {
      if (child === null || child === undefined) return;
      node.appendChild(child instanceof Node ? child : document.createTextNode(String(child)));
    });
    return node;
  }

  // Поля данных бывают строкой или парой {ru, en}. Одна функция на оба случая.
  function t(value) {
    if (value === null || value === undefined) return "";
    if (typeof value === "string") return value;
    return value[state.lang] || value.ru || "";
  }

  function block(labelText, content) {
    return el("section", { class: "block fade" }, [
      el("div", { class: "label", text: labelText }),
      el("div", {}, [].concat(content)),
    ]);
  }

  // --- отрисовка -------------------------------------------------------------

  function paintHeader() {
    var person = state.data.person;
    document.getElementById("name").textContent = t(person.name);
    document.documentElement.lang = state.lang;
    document.title = t(person.name) + " — Computer Science";

    var contacts = document.getElementById("contacts");
    contacts.replaceChildren();
    contacts.appendChild(el("span", { text: t(person.location) }));
    person.links.forEach(function (link) {
      contacts.appendChild(el("a", { href: link.href, text: link.label, rel: "me noopener" }));
    });

    var ui = state.data.ui[state.lang];
    document.getElementById("selector-legend").textContent = ui.roleSwitch;
    document.getElementById("print").textContent = ui.print;
    document.getElementById("print-hint").textContent = ui.printHint;
    document.getElementById("footer-note").textContent = ui.footer;

    [].forEach.call(document.querySelectorAll(".lang button"), function (button) {
      button.setAttribute("aria-pressed", String(button.dataset.lang === state.lang));
    });
  }

  function paintSelector() {
    var selector = document.getElementById("selector");
    [].forEach.call(selector.querySelectorAll(".role-btn"), function (n) { n.remove(); });
    state.data.roles.forEach(function (role) {
      selector.appendChild(el("button", {
        type: "button",
        class: "role-btn",
        "aria-pressed": String(role.id === state.role),
        onclick: function () { setRole(role.id); },
      }, [
        el("span", { class: "role-btn__code", text: role.code }),
        el("span", { class: "role-btn__name", text: t(role.short) }),
      ]));
    });
  }

  function paintStage() {
    var data = state.data;
    var ui = data.ui[state.lang];
    var role = data.roles.filter(function (r) { return r.id === state.role; })[0];
    var stage = document.getElementById("stage");

    var passport = el("table", { class: "spec" }, [
      el("tbody", {}, [
        el("tr", {}, [
          el("td", { text: state.lang === "ru" ? "Роль" : "Role" }),
          el("td", { text: t(role.label) }),
        ]),
      ].concat(data.passport[state.lang].map(function (row) {
        return el("tr", {}, [el("td", { text: row[0] }), el("td", { text: row[1] })]);
      })))
    ]);

    var figures = el("div", { class: "figures" }, role.metrics.map(function (metric) {
      return el("div", { class: "figure" }, [
        el("b", { text: metric.value }),
        el("span", { text: t(metric.label) }),
      ]);
    }));

    var chips = el("div", { class: "chips" }, role.stack.map(function (item) {
      return el("span", { class: "chip", text: item });
    }));

    var projects = role.projects.map(function (key) {
      var project = data.projects[key];
      if (!project) return null;
      return el("article", { class: "project" }, [
        el("div", { class: "project__head" }, [
          el("a", { class: "project__name", href: project.href, rel: "noopener", text: t(project.name) }),
          el("span", { class: "project__tag", text: t(project.tag) }),
        ]),
        el("p", { text: t(project.text) }),
      ]);
    }).filter(Boolean);

    var experience = data.experience.map(function (item) {
      return el("article", { class: "entry" }, [
        el("div", { class: "entry__head" }, [
          el("div", {}, [
            el("span", { class: "entry__org", text: item.org }),
            " — ",
            el("span", { class: "entry__role", text: t(item.role) }),
          ]),
          el("span", { class: "entry__period", text: t(item.period) }),
        ]),
        el("p", { text: t(item.text) }),
      ]);
    });

    var education = data.education.map(function (item) {
      return el("article", { class: "entry" }, [
        el("div", { class: "entry__head" }, [el("span", { class: "entry__org", text: t(item.org) })]),
        el("p", { text: t(item.line) }),
        el("p", { class: "note", text: t(item.note) }),
      ]);
    });

    var courses = el("table", { class: "courses" }, [
      el("tbody", {}, data.courses.map(function (course) {
        return el("tr", {}, [
          el("td", { text: course.year }),
          el("td", { text: course.name }),
          el("td", { text: course.org }),
        ]);
      })),
    ]);

    stage.replaceChildren(
      block(ui.summary, [
        el("h2", { class: "headline", text: t(role.headline) }),
        el("p", { class: "summary", text: t(role.summary) }),
      ]),
      block(ui.passport, passport),
      block(ui.metrics, figures),
      block(ui.stack, chips),
      block(ui.projects, projects),
      block(ui.experience, experience),
      block(ui.education, education),
      block(ui.courses, courses)
    );
  }

  function paint() {
    paintHeader();
    paintSelector();
    paintStage();
  }

  // --- состояние в адресе: ссылку на конкретную роль можно отправить ---------

  function readHash() {
    var parts = location.hash.replace(/^#\/?/, "").split("/");
    var roles = state.data.roles.map(function (r) { return r.id; });
    if (roles.indexOf(parts[0]) !== -1) state.role = parts[0];
    if (parts[1] === "en" || parts[1] === "ru") state.lang = parts[1];
  }

  function writeHash() {
    location.replace("#/" + state.role + "/" + state.lang);
  }

  function setRole(id) { state.role = id; writeHash(); paint(); }
  function setLang(code) { state.lang = code; writeHash(); paint(); }

  // --- запуск ---------------------------------------------------------------

  fetch("data/profile.json")
    .then(function (response) {
      if (!response.ok) throw new Error(response.status + " " + response.statusText);
      return response.json();
    })
    .then(function (data) {
      state.data = data;
      if (!state.data.roles.length) throw new Error("в данных нет ни одной роли");
      readHash();
      paint();

      [].forEach.call(document.querySelectorAll(".lang button"), function (button) {
        button.addEventListener("click", function () { setLang(button.dataset.lang); });
      });
      document.getElementById("print").addEventListener("click", function () { window.print(); });
      window.addEventListener("hashchange", function () { readHash(); paint(); });
    })
    .catch(function (error) {
      document.getElementById("stage").replaceChildren(
        el("section", { class: "block" }, [
          el("div", { class: "label", text: "Ошибка" }),
          el("div", {}, [
            el("p", { text: "Не удалось прочитать data/profile.json: " + error.message }),
            el("p", { text: "Страница открыта файлом с диска? Браузер запрещает fetch по file:// — подними локальный сервер: python3 -m http.server" }),
          ]),
        ])
      );
    });
})();
