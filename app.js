// Massa de dados fictícios para inicializar o sistema localmente (Seed Data)
const SEED_VEHICLES = [];

const SEED_DRIVERS = [];

const SEED_TRIPS = [];

// Helper para gerar datas dinâmicas relativas a hoje
function getRelativeDate(daysOffset) {
    const date = new Date();
    date.setDate(date.getDate() + daysOffset);
    return date.toISOString().split('T')[0];
}

// -------------------------------------------------------------
// INICIALIZAÇÃO E MODELO DE DADOS (DATABASE HANDLER)
// -------------------------------------------------------------
let db = null; // Instância do Firestore

// Dados em memória local para sincronização/fallback
let appData = {
    vehicles: [],
    drivers: [],
    trips: []
};

// Callback para atualizar a UI sempre que houver modificações nos dados
let onDataChangedCallback = () => {};

let activeFilterPeriod = "all"; // "all", "m-0"..."m-11", "q-1"..."q-4", "s-1"..."s-2"
let activeFilterYear = "all";   // "all" or year number (e.g. 2026)

function getFilteredTrips() {
    if (activeFilterPeriod === "all" && activeFilterYear === "all") {
        return appData.trips;
    }
    
    return appData.trips.filter(t => {
        if (!t.data) return false;
        const tripDate = new Date(t.data + "T00:00:00");
        const month = tripDate.getMonth(); // 0 a 11
        const year = tripDate.getFullYear();
        
        // Validação de Ano
        if (activeFilterYear !== "all" && year !== parseInt(activeFilterYear)) {
            return false;
        }
        
        // Validação de Período
        if (activeFilterPeriod === "all") {
            return true;
        }
        
        // Filtro por Mês
        if (activeFilterPeriod.startsWith("m-")) {
            const targetMonth = parseInt(activeFilterPeriod.replace("m-", ""));
            return month === targetMonth;
        }
        
        // Filtro por Trimestre
        if (activeFilterPeriod === "q-1") {
            return month >= 0 && month <= 2; // Jan, Fev, Mar
        }
        if (activeFilterPeriod === "q-2") {
            return month >= 3 && month <= 5; // Abr, Mai, Jun
        }
        if (activeFilterPeriod === "q-3") {
            return month >= 6 && month <= 8; // Jul, Ago, Set
        }
        if (activeFilterPeriod === "q-4") {
            return month >= 9 && month <= 11; // Out, Nov, Dez
        }
        
        // Filtro por Semestre
        if (activeFilterPeriod === "s-1") {
            return month >= 0 && month <= 5; // Jan a Jun
        }
        if (activeFilterPeriod === "s-2") {
            return month >= 6 && month <= 11; // Jul a Dez
        }
        
        return true;
    });
}

if (USE_FIREBASE) {
    try {
        firebase.initializeApp(firebaseConfig);
        db = firebase.firestore();
        console.log("Firebase conectado com sucesso!");

        // Escuta em tempo real para coleções no Firestore usando API Compat
        db.collection("vehicles").onSnapshot((snapshot) => {
            appData.vehicles = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            onDataChangedCallback();
        }, (error) => {
            console.error("Erro ao sincronizar veículos:", error);
        });
        
        db.collection("drivers").onSnapshot((snapshot) => {
            appData.drivers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            onDataChangedCallback();
        }, (error) => {
            console.error("Erro ao sincronizar motoristas:", error);
        });

        db.collection("trips").onSnapshot((snapshot) => {
            appData.trips = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            onDataChangedCallback();
        }, (error) => {
            console.error("Erro ao sincronizar viagens:", error);
        });
    } catch (error) {
        console.error("Falha ao inicializar o Firebase. Usando LocalStorage fallback.", error);
        initializeLocalStorage();
    }
} else {
    console.log("Utilizando modo de Demonstração Local (LocalStorage).");
    initializeLocalStorage();
}

function initializeLocalStorage() {
    // Verificar se precisa limpar devido a atualizações de versão/schema (ex: adição do campo 'pago')
    const storedTrips = localStorage.getItem("mbslog_trips");
    if (storedTrips) {
        const parsed = JSON.parse(storedTrips);
        if (parsed.length > 0 && parsed[0].pago === undefined) {
            // Limpa o localStorage para carregar a nova versão dos dados de semente
            localStorage.removeItem("mbslog_vehicles");
            localStorage.removeItem("mbslog_drivers");
            localStorage.removeItem("mbslog_trips");
        }
    }

    // Carregar dados ou popular com seeds se vazio
    if (!localStorage.getItem("mbslog_vehicles")) {
        localStorage.setItem("mbslog_vehicles", JSON.stringify(SEED_VEHICLES));
        localStorage.setItem("mbslog_drivers", JSON.stringify(SEED_DRIVERS));
        localStorage.setItem("mbslog_trips", JSON.stringify(SEED_TRIPS));
    }

    appData.vehicles = JSON.parse(localStorage.getItem("mbslog_vehicles"));
    appData.drivers = JSON.parse(localStorage.getItem("mbslog_drivers"));
    appData.trips = JSON.parse(localStorage.getItem("mbslog_trips"));

    setTimeout(() => { onDataChangedCallback(); }, 100);
}

// Operações de Escrita (CRUD) abstratas para lidar com Cloud ou LocalStorage
async function addVehicle(vehicle) {
    vehicle.id = "v_" + Date.now();
    if (USE_FIREBASE && db) {
        await db.collection("vehicles").add(vehicle);
    } else {
        appData.vehicles.push(vehicle);
        localStorage.setItem("mbslog_vehicles", JSON.stringify(appData.vehicles));
        onDataChangedCallback();
    }
}

async function addDriver(driver) {
    driver.id = "d_" + Date.now();
    if (USE_FIREBASE && db) {
        await db.collection("drivers").add(driver);
    } else {
        appData.drivers.push(driver);
        localStorage.setItem("mbslog_drivers", JSON.stringify(appData.drivers));
        onDataChangedCallback();
    }
}

async function addTrip(trip) {
    trip.id = "t_" + Date.now();
    // Conversões de tipo numérico
    trip.receita = parseFloat(trip.receita) || 0;
    trip.combustivel = parseFloat(trip.combustivel) || 0;
    trip.pedagio = parseFloat(trip.pedagio) || 0;
    trip.diarias = parseFloat(trip.diarias) || 0;
    trip.comissao = parseFloat(trip.comissao) || 0;
    trip.manutencao = parseFloat(trip.manutencao) || 0;

    if (USE_FIREBASE && db) {
        await db.collection("trips").add(trip);
    } else {
        appData.trips.push(trip);
        localStorage.setItem("mbslog_trips", JSON.stringify(appData.trips));
        onDataChangedCallback();
    }
}

async function removeVehicle(id) {
    if (USE_FIREBASE && db) {
        const querySnapshot = await db.collection("vehicles").get();
        querySnapshot.forEach(async (docRef) => {
            if (docRef.data().id === id || docRef.id === id) {
                await db.collection("vehicles").doc(docRef.id).delete();
            }
        });
    } else {
        appData.vehicles = appData.vehicles.filter(v => v.id !== id);
        localStorage.setItem("mbslog_vehicles", JSON.stringify(appData.vehicles));
        onDataChangedCallback();
    }
}

async function removeDriver(id) {
    if (USE_FIREBASE && db) {
        const querySnapshot = await db.collection("drivers").get();
        querySnapshot.forEach(async (docRef) => {
            if (docRef.data().id === id || docRef.id === id) {
                await db.collection("drivers").doc(docRef.id).delete();
            }
        });
    } else {
        appData.drivers = appData.drivers.filter(d => d.id !== id);
        localStorage.setItem("mbslog_drivers", JSON.stringify(appData.drivers));
        onDataChangedCallback();
    }
}

async function removeTrip(id) {
    if (USE_FIREBASE && db) {
        const querySnapshot = await db.collection("trips").get();
        querySnapshot.forEach(async (docRef) => {
            if (docRef.data().id === id || docRef.id === id) {
                await db.collection("trips").doc(docRef.id).delete();
            }
        });
    } else {
        appData.trips = appData.trips.filter(t => t.id !== id);
        localStorage.setItem("mbslog_trips", JSON.stringify(appData.trips));
        onDataChangedCallback();
    }
}

async function updateTripStatus(id, newStatus) {
    if (USE_FIREBASE && db) {
        const querySnapshot = await db.collection("trips").get();
        querySnapshot.forEach(async (docRef) => {
            if (docRef.data().id === id || docRef.id === id) {
                await db.collection("trips").doc(docRef.id).update({ status: newStatus });
            }
        });
    } else {
        appData.trips = appData.trips.map(t => {
            if (t.id === id) t.status = newStatus;
            return t;
        });
        localStorage.setItem("mbslog_trips", JSON.stringify(appData.trips));
        onDataChangedCallback();
    }
}

async function updateTripPayment(id, newPayment) {
    if (USE_FIREBASE && db) {
        const querySnapshot = await db.collection("trips").get();
        querySnapshot.forEach(async (docRef) => {
            if (docRef.data().id === id || docRef.id === id) {
                await db.collection("trips").doc(docRef.id).update({ pago: newPayment });
            }
        });
    } else {
        appData.trips = appData.trips.map(t => {
            if (t.id === id) t.pago = newPayment;
            return t;
        });
        localStorage.setItem("mbslog_trips", JSON.stringify(appData.trips));
        onDataChangedCallback();
    }
}

async function addExtraExpense(id, amount) {
    if (USE_FIREBASE && db) {
        const querySnapshot = await db.collection("trips").get();
        querySnapshot.forEach(async (docRef) => {
            if (docRef.data().id === id || docRef.id === id) {
                const currentExtra = docRef.data().despesaExtra || 0;
                await db.collection("trips").doc(docRef.id).update({ despesaExtra: currentExtra + amount });
            }
        });
    } else {
        appData.trips = appData.trips.map(t => {
            if (t.id === id) {
                t.despesaExtra = (t.despesaExtra || 0) + amount;
            }
            return t;
        });
        localStorage.setItem("mbslog_trips", JSON.stringify(appData.trips));
        onDataChangedCallback();
    }
}


// -------------------------------------------------------------
// CONTROLLER DA INTERFACE DO USUÁRIO (DOM INTERACTION)
// -------------------------------------------------------------
let financialChart = null;

document.addEventListener("DOMContentLoaded", () => {
    // Gerenciador de Abas (Navigation)
    const navLinks = document.querySelectorAll(".nav-link");
    const tabPanels = document.querySelectorAll(".tab-panel");

    navLinks.forEach(link => {
        link.addEventListener("click", () => {
            navLinks.forEach(l => l.classList.remove("active"));
            tabPanels.forEach(p => p.classList.remove("active"));

            link.classList.add("active");
            const targetTab = link.getAttribute("data-tab");
            document.getElementById(targetTab).classList.add("active");
        });
    });

    // Modais (Abertura/Fechamento)
    setupModals();

    // Formulários
    setupFormSubmits();

    // Definir callback para re-renderizar ao sincronizar dados
    onDataChangedCallback = updateUI;

    // Event Listeners para Filtros de Mês/Ano (sincronizados em todas as abas)
    setupFilters();

    // Event Listener para Exportar Excel
    const btnExport = document.getElementById("btn-export-csv");
    if (btnExport) {
        btnExport.addEventListener("click", exportTripsToCSV);
    }

    // Event Listener para Importar Excel
    const btnImport = document.getElementById("btn-import-csv");
    const inputImport = document.getElementById("input-import-csv");
    if (btnImport && inputImport) {
        btnImport.addEventListener("click", () => {
            inputImport.click();
        });
        inputImport.addEventListener("change", importTripsFromCSV);
    }

    // Atualizar UI inicialmente
    updateUI();
});

function setupModals() {
    const triggerButtons = [
        { btnId: "btn-new-trip", modalId: "modal-trip" },
        { btnId: "btn-new-vehicle", modalId: "modal-vehicle" },
        { btnId: "btn-new-driver", modalId: "modal-driver" }
    ];

    triggerButtons.forEach(trigger => {
        const btn = document.getElementById(trigger.btnId);
        const modal = document.getElementById(trigger.modalId);
        if (btn && modal) {
            btn.addEventListener("click", () => {
                modal.classList.add("active");
                populateDropdowns(); // Carrega veículos/motoristas nos selects da nova viagem
            });
        }
    });

    // Botões de fechar nos modais
    document.querySelectorAll(".modal-close, .btn-cancel").forEach(btn => {
        btn.addEventListener("click", (e) => {
            e.preventDefault();
            btn.closest(".modal-overlay").classList.remove("active");
        });
    });
}

function populateDropdowns() {
    const tripVehicleSelect = document.getElementById("trip_vehicle");
    const tripDriverSelect = document.getElementById("trip_driver");

    if (tripVehicleSelect) {
        tripVehicleSelect.innerHTML = '<option value="">Selecione a Placa</option>';
        appData.vehicles.forEach(v => {
            tripVehicleSelect.innerHTML += `<option value="${v.placa}">${v.placa} - ${v.modelo}</option>`;
        });
    }

    if (tripDriverSelect) {
        tripDriverSelect.innerHTML = '<option value="">Selecione o Motorista</option>';
        appData.drivers.forEach(d => {
            tripDriverSelect.innerHTML += `<option value="${d.nome}">${d.nome}</option>`;
        });
    }
}

function setupFormSubmits() {
    // Nova Viagem
    const tripForm = document.getElementById("form-trip");
    if (tripForm) {
        tripForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const formData = {
                cliente: document.getElementById("trip_client").value,
                origem: document.getElementById("trip_origin").value,
                destino: document.getElementById("trip_destination").value,
                placa: document.getElementById("trip_vehicle").value,
                motorista: document.getElementById("trip_driver").value,
                receita: parseFloat(document.getElementById("trip_receita").value) || 0,
                combustivel: parseFloat(document.getElementById("trip_diesel").value) || 0,
                pedagio: parseFloat(document.getElementById("trip_tolls").value) || 0,
                diarias: parseFloat(document.getElementById("trip_diarias").value) || 0,
                comissao: parseFloat(document.getElementById("trip_comission").value) || 0,
                manutencao: parseFloat(document.getElementById("trip_maint").value) || 0,
                status: document.getElementById("trip_status").value,
                data: document.getElementById("trip_date").value || getRelativeDate(0),
                pago: document.getElementById("trip_payment_status").value,
                dataRecebimento: document.getElementById("trip_payment_date").value || ""
            };
            
            await addTrip(formData);
            tripForm.reset();
            document.getElementById("modal-trip").classList.remove("active");
        });
    }

    // Novo Veículo
    const vehicleForm = document.getElementById("form-vehicle");
    if (vehicleForm) {
        vehicleForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const formData = {
                placa: document.getElementById("vehicle_plate").value.toUpperCase(),
                modelo: document.getElementById("vehicle_model").value,
                tipo: document.getElementById("vehicle_type").value,
                propriedade: document.getElementById("vehicle_ownership").value
            };
            await addVehicle(formData);
            vehicleForm.reset();
            document.getElementById("modal-vehicle").classList.remove("active");
        });
    }

    // Novo Motorista
    const driverForm = document.getElementById("form-driver");
    if (driverForm) {
        driverForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const formData = {
                nome: document.getElementById("driver_name").value,
                cnh: document.getElementById("driver_cnh").value,
                categoria: document.getElementById("driver_cat").value,
                validade: document.getElementById("driver_validity").value
            };
            await addDriver(formData);
            driverForm.reset();
            document.getElementById("modal-driver").classList.remove("active");
        });
    }
}


// -------------------------------------------------------------
// FILTROS DE PERÍODO (MÊS, TRIMESTRE, SEMESTRE) E ANO SINCRONIZADOS
// -------------------------------------------------------------
function setupFilters() {
    // IDs de todos os selects de período e ano nas diferentes abas
    const periodSelectIds = ["filter-period", "filter-period-trips", "filter-period-reports"];
    const yearSelectIds = ["filter-year", "filter-year-trips", "filter-year-reports"];
    
    // Popular os selects de ano
    populateYearSelects();
    
    // Adicionar event listeners para sincronizar período (mês, trimestre, semestre)
    periodSelectIds.forEach(id => {
        const select = document.getElementById(id);
        if (select) {
            select.addEventListener("change", () => {
                activeFilterPeriod = select.value;
                // Sincronizar todos os selects de período
                periodSelectIds.forEach(otherId => {
                    const otherSelect = document.getElementById(otherId);
                    if (otherSelect && otherSelect !== select) {
                        otherSelect.value = activeFilterPeriod;
                    }
                });
                updateUI();
            });
        }
    });
    
    // Adicionar event listeners para sincronizar ano
    yearSelectIds.forEach(id => {
        const select = document.getElementById(id);
        if (select) {
            select.addEventListener("change", () => {
                activeFilterYear = select.value;
                // Sincronizar todos os selects de ano
                yearSelectIds.forEach(otherId => {
                    const otherSelect = document.getElementById(otherId);
                    if (otherSelect && otherSelect !== select) {
                        otherSelect.value = activeFilterYear;
                    }
                });
                updateUI();
            });
        }
    });
    
    // Botão limpar filtros
    const btnClear = document.getElementById("btn-clear-filters");
    if (btnClear) {
        btnClear.addEventListener("click", () => {
            activeFilterPeriod = "all";
            activeFilterYear = "all";
            periodSelectIds.forEach(id => {
                const el = document.getElementById(id);
                if (el) el.value = "all";
            });
            yearSelectIds.forEach(id => {
                const el = document.getElementById(id);
                if (el) el.value = "all";
            });
            updateUI();
        });
    }
}

function populateYearSelects() {
    const yearSelectIds = ["filter-year", "filter-year-trips", "filter-year-reports"];
    
    // Extrair anos únicos das viagens + adicionar o ano atual e adjacentes
    const currentYear = new Date().getFullYear();
    const yearsSet = new Set([currentYear - 1, currentYear, currentYear + 1]);
    
    appData.trips.forEach(t => {
        if (t.data) {
            const year = new Date(t.data + "T00:00:00").getFullYear();
            if (!isNaN(year)) yearsSet.add(year);
        }
    });
    
    const years = [...yearsSet].sort((a, b) => b - a); // Mais recente primeiro
    
    yearSelectIds.forEach(id => {
        const select = document.getElementById(id);
        if (select) {
            select.innerHTML = '<option value="all">Todos</option>';
            years.forEach(year => {
                const option = document.createElement("option");
                option.value = year;
                option.textContent = year;
                select.appendChild(option);
            });
            // Manter seleção ativa
            select.value = activeFilterYear;
        }
    });
}

// -------------------------------------------------------------
// RENDERIZAÇÃO DA TELA E CÁLCULO DE RELATÓRIOS
// -------------------------------------------------------------
function updateUI() {
    // 0. Atualizar opções de ano nos filtros (caso novas viagens tenham sido adicionadas)
    populateYearSelects();

    // 1. Atualizar Painel de Banco de Dados / Nuvem
    const dbStatus = document.getElementById("db-status");
    if (dbStatus) {
        if (USE_FIREBASE) {
            dbStatus.className = "badge success";
            dbStatus.textContent = "NUVEM CLOUD (FIRESTORE) CONECTADO";
        } else {
            dbStatus.className = "badge warning";
            dbStatus.textContent = "DEMONSTRAÇÃO LOCAL (LOCALSTORAGE)";
        }
    }

    // 2. Calcular e Renderizar Alertas (CNH)
    renderCNHAlerts();

    // 3. Calcular e Renderizar KPIs do Dashboard
    renderDashboardKPIs();

    // 4. Renderizar Tabelas Administrativas
    renderTripsTable();
    renderReceivablesTable(); // Nova tabela de contas a receber
    renderVehiclesTable();
    renderDriversTable();

    // 5. Renderizar Relatórios Consolidados
    renderReports();

    // 6. Atualizar Gráfico Financeiro
    renderChart();
}

function renderCNHAlerts() {
    const alertBox = document.getElementById("alert-container");
    if (!alertBox) return;

    alertBox.innerHTML = "";
    const today = new Date();
    let alertCount = 0;

    appData.drivers.forEach(d => {
        if (!d.validade) return;
        const expDate = new Date(d.validade + "T00:00:00");
        const diffTime = expDate - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays < 0) {
            alertCount++;
            alertBox.innerHTML += `
                <div class="alert-item danger">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2"></polygon><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                    <div><strong>CNH Expirada:</strong> O motorista <strong>${d.nome}</strong> está com a CNH vencida desde ${formatDate(d.validade)}. Operação irregular!</div>
                </div>
            `;
        } else if (diffDays <= 30) {
            alertCount++;
            alertBox.innerHTML += `
                <div class="alert-item warning">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
                    <div><strong>CNH Vencendo:</strong> A CNH do motorista <strong>${d.nome}</strong> vence em ${diffDays} dias (${formatDate(d.validade)}). Planejar renovação.</div>
                </div>
            `;
        }
    });

    if (alertCount === 0) {
        alertBox.innerHTML = `
            <div class="alert-item info">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
                <div>Tudo em ordem. Nenhuma CNH necessitando de atenção nos próximos 30 dias.</div>
            </div>
        `;
    }
}

function renderDashboardKPIs() {
    let totalRevenue = 0;
    let totalExpenses = 0;
    let totalReceivables = 0;
    let activeTrips = 0;
    const filteredTrips = getFilteredTrips();

    filteredTrips.forEach(t => {
        totalRevenue += t.receita || 0;
        totalExpenses += (t.combustivel || 0) + (t.pedagio || 0) + (t.diarias || 0) + (t.comissao || 0) + (t.manutencao || 0) + (t.despesaExtra || 0);
        if (t.pago === "Pendente") {
            totalReceivables += t.receita || 0;
        }
        if (t.status === "Em Viagem") {
            activeTrips++;
        }
    });

    const netProfit = totalRevenue - totalExpenses;
    const margin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

    document.getElementById("kpi-revenue").textContent = formatBRL(totalRevenue);
    document.getElementById("kpi-expenses").textContent = formatBRL(totalExpenses);
    document.getElementById("kpi-receivables").textContent = formatBRL(totalReceivables);
    
    const profitEl = document.getElementById("kpi-profit");
    profitEl.textContent = formatBRL(netProfit);
    if (netProfit < 0) {
        profitEl.className = "kpi-value danger";
    } else {
        profitEl.className = "kpi-value profit-positive";
    }

    document.getElementById("kpi-active-trips").textContent = activeTrips;
    document.getElementById("kpi-margin-desc").innerHTML = `Margem média de <span class="trend-up">${margin.toFixed(1)}%</span>`;
}

function renderTripsTable() {
    const tbody = document.getElementById("tbody-trips");
    if (!tbody) return;
    tbody.innerHTML = "";

    const filteredTrips = getFilteredTrips();

    if (filteredTrips.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" style="text-align: center; color: var(--text-secondary);">Nenhuma viagem encontrada para o período selecionado.</td></tr>';
        return;
    }

    filteredTrips.forEach(t => {
        const totalCost = (t.combustivel || 0) + (t.pedagio || 0) + (t.diarias || 0) + (t.comissao || 0) + (t.manutencao || 0) + (t.despesaExtra || 0);
        const profit = t.receita - totalCost;
        const statusClass = t.status === "Concluída" ? "badge success" : "badge warning";
        const paymentClass = t.pago === "Pago" ? "badge success" : "badge warning";

        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td><strong>${formatDate(t.data)}</strong></td>
            <td><strong>${t.cliente}</strong></td>
            <td>${t.origem} → ${t.destino}</td>
            <td><span class="badge info">${t.placa}</span></td>
            <td>${formatBRL(t.receita)}</td>
            <td>${formatBRL(totalCost)}</td>
            <td style="color: ${profit < 0 ? 'var(--danger)' : 'var(--brand-primary)'}; font-weight:600;">${formatBRL(profit)}</td>
            <td>
                <span class="${statusClass}">${t.status}</span>
                <span class="${paymentClass}">${t.pago}</span>
            </td>
            <td>
                <select class="trip-status-select" data-id="${t.id}" style="padding: 2px 6px; font-size: 0.75rem; border-radius: 4px; border: 1px solid var(--border-color); background: var(--bg-surface); color: var(--text-main); margin-bottom: 4px; display: block;">
                    <option value="Em Viagem" ${t.status === "Em Viagem" ? "selected" : ""}>Em Viagem</option>
                    <option value="Concluída" ${t.status === "Concluída" ? "selected" : ""}>Concluída</option>
                    <option value="Cancelada" ${t.status === "Cancelada" ? "selected" : ""}>Cancelada</option>
                </select>
                <select class="trip-payment-select" data-id="${t.id}" style="padding: 2px 6px; font-size: 0.75rem; border-radius: 4px; border: 1px solid var(--border-color); background: var(--bg-surface); color: var(--text-main); display: block;">
                    <option value="Pago" ${t.pago === "Pago" ? "selected" : ""}>Pago</option>
                    <option value="Pendente" ${t.pago === "Pendente" ? "selected" : ""}>Pendente</option>
                </select>
            </td>
            <td style="display: flex; gap: 4px; align-items: center; flex-wrap: wrap;">
                <button class="btn btn-secondary btn-add-expense" data-id="${t.id}" style="padding: 4px 8px; font-size:0.75rem;" title="Adicionar despesa extra">
                    + Despesa
                </button>
                <button class="btn btn-danger btn-delete-trip" data-id="${t.id}" style="padding: 4px 8px; font-size:0.75rem;">
                    Excluir
                </button>
            </td>
        `;
        
        // Add status change listener
        tr.querySelector(".trip-status-select").addEventListener("change", async function() {
            const id = this.getAttribute("data-id");
            const newStatus = this.value;
            await updateTripStatus(id, newStatus);
        });

        // Add payment status change listener
        tr.querySelector(".trip-payment-select").addEventListener("change", async function() {
            const id = this.getAttribute("data-id");
            const newPayment = this.value;
            await updateTripPayment(id, newPayment);
        });

        // Add expense listener
        tr.querySelector(".btn-add-expense").addEventListener("click", async function() {
            const id = this.getAttribute("data-id");
            const extra = prompt("Digite o valor da despesa adicional (R$):");
            if (extra !== null && !isNaN(parseFloat(extra))) {
                await addExtraExpense(id, parseFloat(extra));
            }
        });

        tbody.appendChild(tr);
    });
}

function renderReceivablesTable() {
    const tbody = document.getElementById("tbody-receivables");
    if (!tbody) return;
    tbody.innerHTML = "";

    // Filtrar faturamentos pendentes e ordenar pela data de recebimento prevista (mais próxima primeiro)
    const pendingTrips = getFilteredTrips()
        .filter(t => t.pago === "Pendente" && t.dataRecebimento)
        .sort((a, b) => new Date(a.dataRecebimento) - new Date(b.dataRecebimento));

    if (pendingTrips.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--text-secondary);">Nenhum recebimento futuro pendente.</td></tr>';
        return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    pendingTrips.forEach(t => {
        const dueDate = new Date(t.dataRecebimento + "T00:00:00");
        const diffTime = dueDate - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        let daysStr = "";
        let daysClass = "badge success";

        if (diffDays < 0) {
            daysStr = `Atrasado há ${Math.abs(diffDays)} dias`;
            daysClass = "badge danger";
        } else if (diffDays === 0) {
            daysStr = "Vence hoje";
            daysClass = "badge warning";
        } else {
            daysStr = `Em ${diffDays} dias`;
            daysClass = "badge info";
        }

        tbody.innerHTML += `
            <tr>
                <td><strong>${formatDate(t.dataRecebimento)}</strong></td>
                <td><strong>${t.cliente}</strong></td>
                <td>${t.origem} → ${t.destino}</td>
                <td><span class="badge info">${t.placa}</span></td>
                <td style="color: var(--brand-primary); font-weight:600;">${formatBRL(t.receita)}</td>
                <td><span class="${daysClass}">${daysStr}</span></td>
            </tr>
        `;
    });
}

function renderVehiclesTable() {
    const tbody = document.getElementById("tbody-vehicles");
    if (!tbody) return;
    tbody.innerHTML = "";

    if (appData.vehicles.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: var(--text-secondary);">Nenhum veículo registrado.</td></tr>';
        return;
    }

    appData.vehicles.forEach(v => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td><span class="badge info">${v.placa}</span></td>
            <td><strong>${v.modelo}</strong></td>
            <td>${v.tipo}</td>
            <td><span class="badge ${v.propriedade === 'Própria' ? 'success' : 'warning'}">${v.propriedade}</span></td>
            <td>
                <button class="btn btn-danger btn-delete-vehicle" data-id="${v.id}" style="padding: 4px 8px; font-size:0.75rem;">
                    Excluir
                </button>
            </td>
        `;

        tr.querySelector(".btn-delete-vehicle").addEventListener("click", async function() {
            if (confirm("Tem certeza que deseja excluir este veículo?")) {
                const id = this.getAttribute("data-id");
                await removeVehicle(id);
            }
        });

        tbody.appendChild(tr);
    });
}

function renderDriversTable() {
    const tbody = document.getElementById("tbody-drivers");
    if (!tbody) return;
    tbody.innerHTML = "";

    if (appData.drivers.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: var(--text-secondary);">Nenhum motorista registrado.</td></tr>';
        return;
    }

    appData.drivers.forEach(d => {
        const today = new Date();
        const expDate = new Date(d.validade + "T00:00:00");
        const diffTime = expDate - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        let valClass = "badge success";

        if (diffDays < 0) valClass = "badge danger";
        else if (diffDays <= 30) valClass = "badge warning";

        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td><strong>${d.nome}</strong></td>
            <td>${d.cnh}</td>
            <td><span class="badge info">${d.categoria}</span></td>
            <td><span class="${valClass}">${formatDate(d.validade)}</span></td>
            <td>
                <button class="btn btn-danger btn-delete-driver" data-id="${d.id}" style="padding: 4px 8px; font-size:0.75rem;">
                    Excluir
                </button>
            </td>
        `;

        tr.querySelector(".btn-delete-driver").addEventListener("click", async function() {
            if (confirm("Tem certeza que deseja excluir este motorista?")) {
                const id = this.getAttribute("data-id");
                await removeDriver(id);
            }
        });

        tbody.appendChild(tr);
    });
}

function renderReports() {
    // --- 1. RELATÓRIO: CUSTO POR VEÍCULO (PLACA) ---
    const tbodyVehicleReport = document.getElementById("tbody-report-vehicles");
    if (tbodyVehicleReport) {
        tbodyVehicleReport.innerHTML = "";
        
        // Agregar custos por placa
        const costPerPlaca = {};
        getFilteredTrips().forEach(t => {
            const placa = t.placa || "Sem Veículo";
            const tripCost = (t.combustivel || 0) + (t.pedagio || 0) + (t.diarias || 0) + (t.comissao || 0) + (t.manutencao || 0);
            
            if (!costPerPlaca[placa]) {
                costPerPlaca[placa] = { diesel: 0, maintenance: 0, other: 0, total: 0, count: 0 };
            }
            costPerPlaca[placa].diesel += t.combustivel || 0;
            costPerPlaca[placa].maintenance += t.manutencao || 0;
            costPerPlaca[placa].other += (t.pedagio || 0) + (t.diarias || 0) + (t.comissao || 0);
            costPerPlaca[placa].total += tripCost;
            costPerPlaca[placa].count++;
        });

        const placas = Object.keys(costPerPlaca);
        if (placas.length === 0) {
            tbodyVehicleReport.innerHTML = '<tr><td colspan="5" style="text-align: center; color: var(--text-secondary);">Sem dados de viagens para agregar.</td></tr>';
        } else {
            placas.forEach(placa => {
                const data = costPerPlaca[placa];
                tbodyVehicleReport.innerHTML += `
                    <tr>
                        <td><span class="badge info">${placa}</span></td>
                        <td>${data.count} viagens</td>
                        <td>${formatBRL(data.diesel)}</td>
                        <td>${formatBRL(data.maintenance)}</td>
                        <td><strong>${formatBRL(data.total)}</strong></td>
                    </tr>
                `;
            });
        }
    }

    // --- 2. RELATÓRIO: FATURAMENTO POR CLIENTE ---
    const tbodyClientReport = document.getElementById("tbody-report-clients");
    if (tbodyClientReport) {
        tbodyClientReport.innerHTML = "";
        
        const clientData = {};
        getFilteredTrips().forEach(t => {
            const cli = t.cliente || "Diversos";
            const tripCost = (t.combustivel || 0) + (t.pedagio || 0) + (t.diarias || 0) + (t.comissao || 0) + (t.manutencao || 0);
            const profit = t.receita - tripCost;

            if (!clientData[cli]) {
                clientData[cli] = { revenue: 0, profit: 0, count: 0 };
            }
            clientData[cli].revenue += t.receita || 0;
            clientData[cli].profit += profit;
            clientData[cli].count++;
        });

        const clients = Object.keys(clientData);
        if (clients.length === 0) {
            tbodyClientReport.innerHTML = '<tr><td colspan="5" style="text-align: center; color: var(--text-secondary);">Sem dados de viagens para agregar.</td></tr>';
        } else {
            clients.forEach(cli => {
                const data = clientData[cli];
                const profitMargin = data.revenue > 0 ? (data.profit / data.revenue) * 100 : 0;
                tbodyClientReport.innerHTML += `
                    <tr>
                        <td><strong>${cli}</strong></td>
                        <td>${data.count} viagens</td>
                        <td>${formatBRL(data.revenue)}</td>
                        <td style="color: ${data.profit < 0 ? 'var(--danger)' : 'var(--brand-primary)'}; font-weight:600;">${formatBRL(data.profit)}</td>
                        <td><span class="badge success">${profitMargin.toFixed(1)}%</span></td>
                    </tr>
                `;
            });
        }
    }
}

// -------------------------------------------------------------
// RENDERIZAÇÃO DE GRÁFICOS (CHART.JS)
// -------------------------------------------------------------
function renderChart() {
    const ctx = document.getElementById("canvas-financial");
    if (!ctx) return;

    // Agrupar por data (simplificado para fins de demonstração: agrupa por dia ou mês)
    // Para simplificar, agruparemos os dados das últimas 10 viagens por data do lançamento
    const sortedTrips = [...getFilteredTrips()].sort((a, b) => new Date(a.data) - new Date(b.data));
    
    // Obter datas únicas como labels
    const labels = [];
    const revenues = [];
    const expenses = [];

    // Agrupamento básico por data
    const dailyData = {};
    sortedTrips.forEach(t => {
        const dateStr = formatDate(t.data);
        if (!dailyData[dateStr]) {
            dailyData[dateStr] = { revenue: 0, expense: 0 };
        }
        dailyData[dateStr].revenue += t.receita || 0;
        dailyData[dateStr].expense += (t.combustivel || 0) + (t.pedagio || 0) + (t.diarias || 0) + (t.comissao || 0) + (t.manutencao || 0);
    });

    Object.keys(dailyData).forEach(date => {
        labels.push(date);
        revenues.push(dailyData[date].revenue);
        expenses.push(dailyData[date].expense);
    });

    // Destruir gráfico anterior para evitar sobreposição de hover
    if (financialChart) {
        financialChart.destroy();
    }

    // Criar novo Chart
    try {
        financialChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Faturamento (Receita)',
                        data: revenues,
                        backgroundColor: '#2be2e6', // Ciano
                        borderRadius: 4
                    },
                    {
                        label: 'Custos de Viagem',
                        data: expenses,
                        backgroundColor: '#1e3a5f', // Azul escuro
                        borderRadius: 4
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        labels: {
                            color: '#f9fafb',
                            font: { family: 'Inter' }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: { color: 'rgba(255,255,255,0.03)' },
                        ticks: { color: '#9ca3af', font: { family: 'Inter' } }
                    },
                    y: {
                        grid: { color: 'rgba(255,255,255,0.03)' },
                        ticks: { 
                            color: '#9ca3af',
                            font: { family: 'Inter' },
                            callback: function(value) {
                                return 'R$ ' + value.toLocaleString('pt-BR');
                            }
                        }
                    }
                }
            }
        });
    } catch (e) {
        console.error("Falha ao desenhar o gráfico", e);
    }
}

// -------------------------------------------------------------
// UTILS E FORMATADORES
// -------------------------------------------------------------
function formatBRL(value) {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatDate(dateString) {
    if (!dateString) return "-";
    const parts = dateString.split('-');
    if (parts.length !== 3) return dateString;
    return `${parts[2]}/${parts[1]}/${parts[0]}`; // Retorna DD/MM/AAAA
}

function exportTripsToCSV() {
    const tripsToExport = getFilteredTrips();
    if (tripsToExport.length === 0) {
        alert("Nenhuma viagem registrada para exportar.");
        return;
    }

    // Ponto e vírgula como separador para compatibilidade padrão com Excel em português
    let csvContent = "\uFEFF"; // UTF-8 BOM para abrir com acentos corretos no Excel
    csvContent += "Data;Cliente;Origem;Destino;Placa;Motorista;Receita Bruta;Combustível;Pedágio;Diárias;Comissão;Manutenção;Status Viagem;Status Pagamento;Data Recebimento\r\n";

    tripsToExport.forEach(t => {
        const row = [
            t.data || "",
            t.cliente || "",
            t.origem || "",
            t.destino || "",
            t.placa || "",
            t.motorista || "",
            t.receita || 0,
            t.combustivel || 0,
            t.pedagio || 0,
            t.diarias || 0,
            t.comissao || 0,
            t.manutencao || 0,
            t.status || "",
            t.pago || "Pago",
            t.dataRecebimento || ""
        ].join(";");
        csvContent += row + "\r\n";
    });

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `viagens_exportadas_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function importTripsFromCSV(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async function(evt) {
        const text = evt.target.result;
        const lines = text.split(/\r?\n/);
        
        let importCount = 0;
        let skipCount = 0;

        // Pular a primeira linha de cabeçalho
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;

            const cols = line.split(";");
            if (cols.length < 12) {
                skipCount++;
                continue;
            }

            const trip = {
                data: cols[0] || getRelativeDate(0),
                cliente: cols[1] || "Cliente Importado",
                origem: cols[2] || "",
                destino: cols[3] || "",
                placa: cols[4] || "",
                motorista: cols[5] || "",
                receita: parseFloat(cols[6]) || 0,
                combustivel: parseFloat(cols[7]) || 0,
                pedagio: parseFloat(cols[8]) || 0,
                diarias: parseFloat(cols[9]) || 0,
                comissao: parseFloat(cols[10]) || 0,
                manutencao: parseFloat(cols[11]) || 0,
                status: cols[12] || "Concluída",
                pago: cols[13] || "Pago",
                dataRecebimento: cols[14] || ""
            };

            await addTrip(trip);
            importCount++;
        }

        alert(`Importação concluída!\nViagens importadas: ${importCount}\nLinhas ignoradas: ${skipCount}`);
        e.target.value = ""; // Resetar o campo do arquivo
    };
    reader.readAsText(file, "UTF-8");
}
