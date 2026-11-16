(() => {
  "use strict";
  const get = id => document.getElementById(id);
  const form = get("credito");
  const fields = form.elements;
  const key = "estateagency.credito.v1";
  const money = new Intl.NumberFormat("es-CR", {style:"currency", currency:"CRC"});
  const percent = new Intl.NumberFormat("es-CR", {style:"percent", maximumFractionDigits:2});
  const now = new Date();
  fields.nacimiento.max = [now.getFullYear(), String(now.getMonth()+1).padStart(2,"0"), String(now.getDate()).padStart(2,"0")].join("-");
  const names = ["nombre","correo","nacimiento","salario","vivienda","monto","tasa","plazo"];

  function age(date) {
    const [year, month, day] = date.split("-").map(Number);
    const birthdayPending = now.getMonth()+1 < month || (now.getMonth()+1 === month && now.getDate() < day);
    return now.getFullYear() - year - Number(birthdayPending);
  }

  function updateLimit() {
    const cap = Math.floor((Number(fields.vivienda.value) * 80 + 1e-7)) / 100;
    fields.monto.max = fields.vivienda.value ? String(cap) : "";
    fields.monto.setCustomValidity(fields.monto.validity.rangeOverflow ? "El monto solicitado no puede superar el 80 % del valor de la vivienda." : "");
    get("limite").textContent = cap > 0 ? "Monto máximo: " + money.format(cap) : "Máximo 80 % del valor de la vivienda.";
    get("anios").value = fields.plazo.value;
  }

  function calculate(showSchedule) {
    updateLimit();
    if (!form.reportValidity()) return;
    const data = Object.fromEntries(names.map(name => [name, fields[name].value]));
    const principal = Number(data.monto);
    const monthlyRate = Number(data.tasa) / 1200;
    const months = Number(data.plazo) * 12;
    const monthly = monthlyRate === 0 ? principal / months :
      principal * monthlyRate / -Math.expm1(-months * Math.log1p(monthlyRate));
    const minimum = monthly / 0.40;
    const years = age(data.nacimiento);

    get("pago").value = money.format(monthly);
    get("minimo").value = money.format(minimum);
    get("estado-salario").textContent = Number(data.salario) >= minimum ? "Monto de salario suficiente para el crédito" : "Monto de salario insuficiente";
    get("estado-edad").textContent = years > 22 && years < 55 ? "Cliente con edad suficiente para crédito" : "Cliente no califica para crédito por edad";
    get("financia").textContent = "Porcentaje de la vivienda financiado (monto ÷ valor): " + percent.format(principal / Number(data.vivienda));
    get("relacion").textContent = "Relación indicada por el enunciado (valor ÷ monto): " + percent.format(Number(data.vivienda) / principal);
    try {
      localStorage.setItem(key, JSON.stringify(data));
      get("estado-guardado").textContent = "";
    } catch {
      get("estado-guardado").textContent = "El navegador no permitió guardar la cotización.";
    }
    get("resultado-credito").hidden = false;
    get("proyeccion").hidden = !showSchedule;
    if (showSchedule) {
      const rows = document.createDocumentFragment();
      let balance = principal;
      for (let month = 1; month <= months; month++) {
        const interest = balance * monthlyRate;
        const amortization = month === months ? balance : monthly - interest;
        const payment = amortization + interest;
        balance = Math.max(0, balance - amortization);
        const row = document.createElement("tr");
        for (const value of [month, ...[payment, interest, amortization, balance].map(x => money.format(x))]) {
          row.insertCell().textContent = value;
        }
        rows.append(row);
      }
      get("cuotas").replaceChildren(rows);
    }
  }

  try {
    const data = JSON.parse(localStorage.getItem(key)) || {};
    for (const name of names) if (typeof data[name] === "string") fields[name].value = data[name];
  } catch { /* Los cálculos funcionan aunque no haya almacenamiento. */ }
  updateLimit();
  form.addEventListener("input", () => {
    updateLimit();
    get("proyeccion").hidden = true;
    get("resultado-credito").hidden = true;
  });
  form.addEventListener("submit", event => { event.preventDefault(); calculate(false); });
  get("proyectar").addEventListener("click", () => calculate(true));
  get("imprimir").addEventListener("click", () => window.print());
})();
