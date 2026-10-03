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

let supabaseClient = null;

if (typeof USE_SUPABASE !== "undefined" && USE_SUPABASE) {
    try {
        supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        console.log("Supabase conectado com sucesso!");

        // Carregar dados iniciais da nuvem
        loadSupabaseData();

        // Escuta em tempo real para coleções no Supabase (Realtime)
        supabaseClient.channel('realtime-vayko-fleet')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'vehicles' }, () => loadVehiclesFromSupabase())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'drivers' }, () => loadDriversFromSupabase())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'trips' }, () => loadTripsFromSupabase())
            .subscribe();

    } catch (error) {
        console.error("Falha ao inicializar o Supabase. Usando LocalStorage fallback.", error);
        initializeLocalStorage();
    }
} else {
    console.log("Utilizando modo de Demonstração Local (LocalStorage).");
    initializeLocalStorage();
}

async function loadSupabaseData() {
    await Promise.all([
        loadVehiclesFromSupabase(),
        loadDriversFromSupabase(),
        loadTripsFromSupabase()
    ]);
}

async function loadVehiclesFromSupabase() {
    if (!supabaseClient) return;
    try {
        const { data, error } = await supabaseClient.from('vehicles').select('*');
        if (!error && data) {
            if (data.length > 0) {
                appData.vehicles = data;
                onDataChangedCallback();
            } else {
                // Popular tabela com dados de semente se estiver vazia
                for (const v of SEED_VEHICLES) {
                    await supabaseClient.from('vehicles').insert([v]);
                }
                const res = await supabaseClient.from('vehicles').select('*');
                if (res.data) {
                    appData.vehicles = res.data;
                    onDataChangedCallback();
                }
            }
        }
    } catch (e) {
        console.warn("Erro ao buscar veículos no Supabase:", e);
    }
}

async function loadDriversFromSupabase() {
    if (!supabaseClient) return;
    try {
        const { data, error } = await supabaseClient.from('drivers').select('*');
        if (!error && data) {
            if (data.length > 0) {
                appData.drivers = data;
                onDataChangedCallback();
            } else {
                for (const d of SEED_DRIVERS) {
                    await supabaseClient.from('drivers').insert([d]);
                }
                const res = await supabaseClient.from('drivers').select('*');
                if (res.data) {
                    appData.drivers = res.data;
                    onDataChangedCallback();
                }
            }
        }
    } catch (e) {
        console.warn("Erro ao buscar motoristas no Supabase:", e);
    }
}

async function loadTripsFromSupabase() {
    if (!supabaseClient) return;
    try {
        const { data, error } = await supabaseClient.from('trips').select('*');
        if (!error && data) {
            if (data.length > 0) {
                appData.trips = data;
                onDataChangedCallback();
            } else {
                for (const t of SEED_TRIPS) {
                    await supabaseClient.from('trips').insert([t]);
                }
                const res = await supabaseClient.from('trips').select('*');
                if (res.data) {
                    appData.trips = res.data;
                    onDataChangedCallback();
                }
            }
        }
    } catch (e) {
        console.warn("Erro ao buscar viagens no Supabase:", e);
    }
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

// Operações de Escrita (CRUD) abstratas para lidar com Cloud (Supabase) ou LocalStorage
async function addVehicle(vehicle) {
    vehicle.id = "v_" + Date.now();
    if (typeof USE_SUPABASE !== "undefined" && USE_SUPABASE && supabaseClient) {
        await supabaseClient.from('vehicles').insert([vehicle]);
        await loadVehiclesFromSupabase();
    } else {
        appData.vehicles.push(vehicle);
        localStorage.setItem("mbslog_vehicles", JSON.stringify(appData.vehicles));
        onDataChangedCallback();
    }
}

async function addDriver(driver) {
    driver.id = "d_" + Date.now();
    if (typeof USE_SUPABASE !== "undefined" && USE_SUPABASE && supabaseClient) {
        await supabaseClient.from('drivers').insert([driver]);
        await loadDriversFromSupabase();
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

    if (typeof USE_SUPABASE !== "undefined" && USE_SUPABASE && supabaseClient) {
        await supabaseClient.from('trips').insert([trip]);
        await loadTripsFromSupabase();
    } else {
        appData.trips.push(trip);
        localStorage.setItem("mbslog_trips", JSON.stringify(appData.trips));
        onDataChangedCallback();
    }
}

async function removeVehicle(id) {
    if (typeof USE_SUPABASE !== "undefined" && USE_SUPABASE && supabaseClient) {
        await supabaseClient.from('vehicles').delete().eq('id', id);
        await loadVehiclesFromSupabase();
    } else {
        appData.vehicles = appData.vehicles.filter(v => v.id !== id);
        localStorage.setItem("mbslog_vehicles", JSON.stringify(appData.vehicles));
        onDataChangedCallback();
    }
}

async function removeDriver(id) {
    if (typeof USE_SUPABASE !== "undefined" && USE_SUPABASE && supabaseClient) {
        await supabaseClient.from('drivers').delete().eq('id', id);
        await loadDriversFromSupabase();
    } else {
        appData.drivers = appData.drivers.filter(d => d.id !== id);
        localStorage.setItem("mbslog_drivers", JSON.stringify(appData.drivers));
        onDataChangedCallback();
    }
}

async function removeTrip(id) {
    if (typeof USE_SUPABASE !== "undefined" && USE_SUPABASE && supabaseClient) {
        await supabaseClient.from('trips').delete().eq('id', id);
        await loadTripsFromSupabase();
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

async function updateTrip(id, updatedData) {
    if (USE_FIREBASE && db) {
        const querySnapshot = await db.collection("trips").get();
        querySnapshot.forEach(async (docRef) => {
            if (docRef.data().id === id || docRef.id === id) {
                await db.collection("trips").doc(docRef.id).update(updatedData);
            }
        });
    } else {
        appData.trips = appData.trips.map(t => {
            if (t.id === id) {
                return { ...t, ...updatedData };
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

    // Botão adicionar despesa extra no modal de detalhes
    const btnAddDetailExpense = document.getElementById("btn-add-detail-expense");
    if (btnAddDetailExpense) {
        btnAddDetailExpense.addEventListener("click", () => {
            const descInput = document.getElementById("edit_expense_desc");
            const valueInput = document.getElementById("edit_expense_value");
            const desc = descInput.value.trim();
            const value = parseFloat(valueInput.value);

            if (!desc || isNaN(value) || value <= 0) {
                alert("Preencha a descrição e um valor válido para a despesa.");
                return;
            }

            // Adicionar ao array temporário de despesas extras
            currentEditExpenses.push({ descricao: desc, valor: value });
            descInput.value = "";
            valueInput.value = "";
            renderDetailExpenses();
            updateDetailSummary();
        });
    }

    // Botão excluir viagem a partir do modal de detalhes
    const btnDeleteFromDetail = document.getElementById("btn-delete-from-detail");
    if (btnDeleteFromDetail) {
        btnDeleteFromDetail.addEventListener("click", async () => {
            const tripId = document.getElementById("edit_trip_id").value;
            if (confirm("Tem certeza que deseja excluir esta viagem permanentemente?")) {
                await removeTrip(tripId);
                document.getElementById("modal-trip-detail").classList.remove("active");
            }
        });
    }
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

    // Editar Viagem (modal de detalhes)
    const editForm = document.getElementById("form-trip-edit");
    if (editForm) {
        editForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const tripId = document.getElementById("edit_trip_id").value;
            const updatedData = {
                cliente: document.getElementById("edit_trip_client").value,
                data: document.getElementById("edit_trip_date").value,
                origem: document.getElementById("edit_trip_origin").value,
                destino: document.getElementById("edit_trip_destination").value,
                placa: document.getElementById("edit_trip_vehicle").value,
                motorista: document.getElementById("edit_trip_driver").value,
                receita: parseFloat(document.getElementById("edit_trip_receita").value) || 0,
                combustivel: parseFloat(document.getElementById("edit_trip_diesel").value) || 0,
                pedagio: parseFloat(document.getElementById("edit_trip_tolls").value) || 0,
                diarias: parseFloat(document.getElementById("edit_trip_diarias").value) || 0,
                comissao: parseFloat(document.getElementById("edit_trip_comission").value) || 0,
                manutencao: parseFloat(document.getElementById("edit_trip_maint").value) || 0,
                status: document.getElementById("edit_trip_status").value,
                pago: document.getElementById("edit_trip_payment_status").value,
                dataRecebimento: document.getElementById("edit_trip_payment_date").value || "",
                despesasExtras: currentEditExpenses,
                despesaExtra: currentEditExpenses.reduce((sum, d) => sum + d.valor, 0)
            };

            await updateTrip(tripId, updatedData);
            document.getElementById("modal-trip-detail").classList.remove("active");
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
    // 0. Atualizar Status do Banco de Dados
    const dbStatus = document.getElementById("db-status");
    if (dbStatus) {
        if (typeof USE_SUPABASE !== "undefined" && USE_SUPABASE) {
            dbStatus.className = "badge success";
            dbStatus.textContent = "NUVEM SUPABASE CONECTADA";
        } else {
            dbStatus.className = "badge warning";
            dbStatus.textContent = "DEMONSTRAÇÃO LOCAL (LOCALSTORAGE)";
        }
    }

    // Atualizar opções de ano nos filtros (caso novas viagens tenham sido adicionadas)
    populateYearSelects();

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

// Variável temporária para despesas extras no modal de edição
let currentEditExpenses = [];

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
        const statusClass = t.status === "Concluída" ? "badge success" : (t.status === "Cancelada" ? "badge danger" : "badge warning");
        const paymentClass = t.pago === "Pago" ? "badge success" : "badge warning";

        const tr = document.createElement("tr");
        tr.className = "trip-row-clickable";
        tr.setAttribute("data-trip-id", t.id);
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
                <button class="btn btn-secondary btn-open-detail" data-id="${t.id}" style="padding: 5px 12px; font-size:0.75rem;" title="Ver detalhes e editar">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                    Detalhes
                </button>
            </td>
        `;

        // Clique na linha inteira abre o detalhe
        tr.addEventListener("click", (e) => {
            // Não abrir se clicou num botão ou link
            if (e.target.closest("button") || e.target.closest("a") || e.target.closest("select")) return;
            openTripDetail(t.id);
        });

        // Botão Detalhes
        tr.querySelector(".btn-open-detail").addEventListener("click", (e) => {
            e.stopPropagation();
            openTripDetail(t.id);
        });

        tbody.appendChild(tr);
    });
}

function openTripDetail(tripId) {
    const trip = appData.trips.find(t => t.id === tripId);
    if (!trip) return;

    // Preencher campos do formulário de edição
    document.getElementById("edit_trip_id").value = trip.id;
    document.getElementById("edit_trip_client").value = trip.cliente || "";
    document.getElementById("edit_trip_date").value = trip.data || "";
    document.getElementById("edit_trip_origin").value = trip.origem || "";
    document.getElementById("edit_trip_destination").value = trip.destino || "";
    document.getElementById("edit_trip_receita").value = trip.receita || 0;
    document.getElementById("edit_trip_diesel").value = trip.combustivel || 0;
    document.getElementById("edit_trip_tolls").value = trip.pedagio || 0;
    document.getElementById("edit_trip_diarias").value = trip.diarias || 0;
    document.getElementById("edit_trip_comission").value = trip.comissao || 0;
    document.getElementById("edit_trip_maint").value = trip.manutencao || 0;
    document.getElementById("edit_trip_status").value = trip.status || "Em Viagem";
    document.getElementById("edit_trip_payment_status").value = trip.pago || "Pendente";
    document.getElementById("edit_trip_payment_date").value = trip.dataRecebimento || "";

    // Título dinâmico
    document.getElementById("detail-modal-title").textContent = `${trip.cliente} — ${trip.origem} → ${trip.destino}`;

    // Popular dropdowns de placa e motorista no modal de edição
    populateEditDropdowns(trip.placa, trip.motorista);

    // Carregar despesas extras existentes
    currentEditExpenses = Array.isArray(trip.despesasExtras) ? [...trip.despesasExtras] : [];
    // Se tem despesaExtra mas não tem array itemizado, criar um item genérico
    if (currentEditExpenses.length === 0 && (trip.despesaExtra || 0) > 0) {
        currentEditExpenses.push({ descricao: "Despesa extra (migrada)", valor: trip.despesaExtra });
    }

    renderDetailExpenses();
    updateDetailSummary();

    // Atualizar resumo ao alterar campos de valor
    const valueFields = ["edit_trip_receita", "edit_trip_diesel", "edit_trip_tolls", "edit_trip_diarias", "edit_trip_comission", "edit_trip_maint"];
    valueFields.forEach(fieldId => {
        const el = document.getElementById(fieldId);
        // Remover listener antigo clonando o nó
        const newEl = el.cloneNode(true);
        el.parentNode.replaceChild(newEl, el);
        newEl.addEventListener("input", updateDetailSummary);
    });

    // Abrir modal
    document.getElementById("modal-trip-detail").classList.add("active");
}

function populateEditDropdowns(selectedPlaca, selectedMotorista) {
    const vehicleSelect = document.getElementById("edit_trip_vehicle");
    const driverSelect = document.getElementById("edit_trip_driver");

    if (vehicleSelect) {
        vehicleSelect.innerHTML = '<option value="">Selecione a Placa</option>';
        appData.vehicles.forEach(v => {
            const selected = v.placa === selectedPlaca ? "selected" : "";
            vehicleSelect.innerHTML += `<option value="${v.placa}" ${selected}>${v.placa} - ${v.modelo}</option>`;
        });
        // Se a placa atual não está nos veículos cadastrados, adicionar como opção
        if (selectedPlaca && !appData.vehicles.find(v => v.placa === selectedPlaca)) {
            vehicleSelect.innerHTML += `<option value="${selectedPlaca}" selected>${selectedPlaca} (não cadastrado)</option>`;
        }
    }

    if (driverSelect) {
        driverSelect.innerHTML = '<option value="">Selecione o Motorista</option>';
        appData.drivers.forEach(d => {
            const selected = d.nome === selectedMotorista ? "selected" : "";
            driverSelect.innerHTML += `<option value="${d.nome}" ${selected}>${d.nome}</option>`;
        });
        // Se o motorista atual não está nos cadastrados, adicionar como opção
        if (selectedMotorista && !appData.drivers.find(d => d.nome === selectedMotorista)) {
            driverSelect.innerHTML += `<option value="${selectedMotorista}" selected>${selectedMotorista} (não cadastrado)</option>`;
        }
    }
}

function renderDetailExpenses() {
    const container = document.getElementById("edit-expenses-list");
    if (!container) return;
    container.innerHTML = "";

    if (currentEditExpenses.length === 0) {
        container.innerHTML = '<div class="detail-expenses-empty">Nenhuma despesa extra adicionada.</div>';
    } else {
        currentEditExpenses.forEach((expense, index) => {
            const item = document.createElement("div");
            item.className = "detail-expense-item";
            item.innerHTML = `
                <div class="expense-info">
                    <span class="expense-desc">${expense.descricao}</span>
                </div>
                <div class="expense-info">
                    <span class="expense-value">- ${formatBRL(expense.valor)}</span>
                    <button type="button" class="btn-remove-expense" data-index="${index}" title="Remover despesa">✕</button>
                </div>
            `;

            item.querySelector(".btn-remove-expense").addEventListener("click", () => {
                currentEditExpenses.splice(index, 1);
                renderDetailExpenses();
                updateDetailSummary();
            });

            container.appendChild(item);
        });
    }

    // Atualizar badge de total extras
    const totalExtras = currentEditExpenses.reduce((sum, d) => sum + d.valor, 0);
    const badge = document.getElementById("edit-total-extras");
    if (badge) {
        badge.textContent = `Total extras: ${formatBRL(totalExtras)}`;
    }
}

function updateDetailSummary() {
    const receita = parseFloat(document.getElementById("edit_trip_receita").value) || 0;
    const diesel = parseFloat(document.getElementById("edit_trip_diesel").value) || 0;
    const pedagio = parseFloat(document.getElementById("edit_trip_tolls").value) || 0;
    const diarias = parseFloat(document.getElementById("edit_trip_diarias").value) || 0;
    const comissao = parseFloat(document.getElementById("edit_trip_comission").value) || 0;
    const manutencao = parseFloat(document.getElementById("edit_trip_maint").value) || 0;
    const totalExtras = currentEditExpenses.reduce((sum, d) => sum + d.valor, 0);

    const totalCustos = diesel + pedagio + diarias + comissao + manutencao + totalExtras;
    const lucro = receita - totalCustos;

    const container = document.getElementById("edit-financial-summary");
    if (container) {
        container.innerHTML = `
            <div class="summary-card">
                <div class="summary-label">Receita Bruta</div>
                <div class="summary-value neutral">${formatBRL(receita)}</div>
            </div>
            <div class="summary-card">
                <div class="summary-label">Custos Totais</div>
                <div class="summary-value negative">${formatBRL(totalCustos)}</div>
            </div>
            <div class="summary-card">
                <div class="summary-label">Saldo Líquido</div>
                <div class="summary-value ${lucro >= 0 ? 'positive' : 'negative'}">${formatBRL(lucro)}</div>
            </div>
        `;
    }
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
