const initialStudents = [];

let students = JSON.parse(localStorage.getItem('students')) || [...initialStudents];
let asistencias = JSON.parse(localStorage.getItem('asistencias')) || [];
let qrScanner = null;

// Inicializar la aplicación
document.addEventListener('DOMContentLoaded', () => {
    renderStudents();
    renderAsistencias();
    setupEventListeners();
});

function setupEventListeners() {
    // () => showStudentForm() asegura que no reciba parámetros basura del click y diga "Agregar" correctamente
    document.getElementById('btnAgregarEstudiante').addEventListener('click', () => showStudentForm());
    document.getElementById('btnAgregarAsistencia').addEventListener('click', () => showAsistenciaForm());
    document.getElementById('btnEstudiantes').addEventListener('click', () => switchSection('estudiantes'));
    document.getElementById('btnAsistencias').addEventListener('click', () => switchSection('asistencias'));
    document.getElementById('btnEscanearQR').addEventListener('click', () => switchSection('escanear'));
    document.getElementById('btnBackup').addEventListener('click', showBackupModal);
    
    document.getElementById('btnExportarEstudiantes').addEventListener('click', exportStudents);
    document.getElementById('btnExportarAsistencias').addEventListener('click', exportAsistencias);
}

function switchSection(section) {
    document.querySelectorAll('nav button').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.section').forEach(sec => sec.classList.remove('active'));

    if (qrScanner) {
        qrScanner.stop().then(() => { qrScanner = null; }).catch(() => { qrScanner = null; });
    }

    if (section === 'estudiantes') {
        document.getElementById('btnEstudiantes').classList.add('active');
        document.getElementById('sectionEstudiantes').classList.add('active');
    } else if (section === 'asistencias') {
        document.getElementById('btnAsistencias').classList.add('active');
        document.getElementById('sectionAsistencias').classList.add('active');
    } else if (section === 'escanear') {
        document.getElementById('btnEscanearQR').classList.add('active');
        document.getElementById('sectionEscanearQR').classList.add('active');
        initQRScanner();
    }
}

function renderStudents() {
    const tbody = document.getElementById('tbodyEstudiantes');
    if (students.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="empty-message">No hay estudiantes registrados</td></tr>`;
    } else {
        tbody.innerHTML = students.map(student => `
            <tr>
                <td>${student.dni}</td>
                <td>${student.nombres}</td>
                <td>${student.apellidos}</td>
                <td>${student.genero}</td>
                <td>${student.telefono}</td>
                <td>${student.edad}</td>
                <td class="actions-cell">
                    <button class="btn-edit" onclick="editStudent('${student.dni}')">✏️</button>
                    <button class="btn-delete" onclick="deleteStudent('${student.dni}')">🗑️</button>
                    <button class="btn-qr" onclick="generateQR('${student.dni}')">📱</button>
                </td>
            </tr>
        `).join('');
    }
    localStorage.setItem('students', JSON.stringify(students));
}

function renderAsistencias() {
    const tbody = document.getElementById('tbodyAsistencias');
    if (asistencias.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="empty-message">No hay asistencias registradas</td></tr>`;
    } else {
        tbody.innerHTML = asistencias.map((asistencia, index) => {
            const student = students.find(s => s.dni === asistencia.dni);
            const nombreCompleto = student ? `${student.nombres} ${student.apellidos}` : 'Desconocido';
            return `
                <tr>
                    <td>${asistencia.fecha}</td>
                    <td>${asistencia.dni}</td>
                    <td>${nombreCompleto}</td>
                    <td>${asistencia.hora}</td>
                    <td>${asistencia.estado}</td>
                    <td class="actions-cell">
                        <button class="btn-edit" onclick="editAsistencia(${index})">✏️</button>
                        <button class="btn-delete" onclick="deleteAsistencia(${index})">🗑️</button>
                    </td>
                </tr>
            `;
        }).join('');
    }
    localStorage.setItem('asistencias', JSON.stringify(asistencias));
}

function showStudentForm(student = null) {
    let tempScanner = null;
    
    Swal.fire({
        title: student ? 'Editar Estudiante' : 'Agregar Estudiante',
        html: `
            <div class="swal-form-flex">
                <div class="form-group-row">
                    <div class="input-field">
                        <label for="dni">DNI</label>
                        <input id="dni" type="text" placeholder="Ingrese DNI" value="${student?.dni || ''}">
                    </div>
                    <button id="btnScanDni" type="button" class="btn-scan-modal">
                        <i class="fas fa-camera"></i> Escanear
                    </button>
                </div>

                <div id="scanner-container-modal" class="scanner-modal-wrapper" style="display:none;">
                    <div id="dni-scanner"></div>
                </div>

                <div class="input-field">
                    <label for="nombres">Nombres</label>
                    <input id="nombres" type="text" placeholder="Nombres del estudiante" value="${student?.nombres || ''}">
                </div>

                <div class="input-field">
                    <label for="apellidos">Apellidos</label>
                    <input id="apellidos" type="text" placeholder="Apellidos del estudiante" value="${student?.apellidos || ''}">
                </div>

                <div class="input-field">
                    <label for="genero">Género</label>
                    <select id="genero">
                        <option value="Masculino" ${student?.genero === 'Masculino' ? 'selected' : ''}>Masculino</option>
                        <option value="Femenino" ${student?.genero === 'Femenino' ? 'selected' : ''}>Femenino</option>
                    </select>
                </div>

                <div class="input-field">
                    <label for="telefono">Teléfono</label>
                    <input id="telefono" type="text" placeholder="Número de teléfono" value="${student?.telefono || ''}">
                </div>

                <div class="input-field">
                    <label for="edad">Edad</label>
                    <input id="edad" type="number" placeholder="Edad" value="${student?.edad || ''}">
                </div>
            </div>
        `,
        confirmButtonText: student ? 'Actualizar' : 'Guardar',
        focusConfirm: false,
        showCancelButton: true,
        cancelButtonText: 'Cancelar',
        customClass: {
            popup: 'swal2-custom-modal-popup'
        },
        willClose: () => {
            if (tempScanner) {
                tempScanner.stop().catch(() => {});
            }
        },
        didOpen: () => {
            const btnScan = document.getElementById('btnScanDni');
            btnScan.addEventListener('click', () => {
                document.getElementById('scanner-container-modal').style.display = 'block';
                btnScan.disabled = true;
                
                Html5Qrcode.getCameras().then(devices => {
                    const backCameras = devices ? devices.filter(d => d.label && d.label.toLowerCase().includes('back')) : [];
                    const selectedCamera = backCameras.length > 0 ? backCameras[0].id : (devices && devices.length ? devices[0].id : null);
                    
                    if (selectedCamera) {
                        tempScanner = new Html5Qrcode('dni-scanner');
                        tempScanner.start(selectedCamera, { fps: 10, qrbox: 180 }, 
                            (decodedText) => {
                                document.getElementById('dni').value = decodedText;
                                btnScan.disabled = false;
                                document.getElementById('scanner-container-modal').style.display = 'none';
                                tempScanner.stop().then(() => { tempScanner = null; });
                            }
                        ).catch(err => {
                            console.error(err);
                            btnScan.disabled = false;
                        });
                    } else {
                        Swal.showValidationMessage('No se detectó cámara trasera o frontal.');
                    }
                }).catch(err => {
                    btnScan.disabled = false;
                    console.error(err);
                });
            });
        },
        preConfirm: () => {
            const dni = document.getElementById('dni').value.trim();
            const nombres = document.getElementById('nombres').value.trim();
            const apellidos = document.getElementById('apellidos').value.trim();
            const genero = document.getElementById('genero').value;
            const telefono = document.getElementById('telefono').value.trim();
            const edad = document.getElementById('edad').value;

            if (!dni || !nombres || !apellidos || !genero || !telefono || !edad) {
                Swal.showValidationMessage('Todos los campos son obligatorios');
                return null;
            }

            if (!student && students.some(s => s.dni === dni)) {
                Swal.showValidationMessage('Este DNI ya está registrado');
                return null;
            }

            return { dni, nombres, apellidos, genero, telefono, edad: parseInt(edad) };
        }
    }).then(result => {
        if (result.isConfirmed) {
            if (student) {
                const index = students.findIndex(s => s.dni === student.dni);
                if (result.value.dni !== student.dni) {
                    asistencias = asistencias.map(a => a.dni === student.dni ? {...a, dni: result.value.dni} : a);
                }
                students[index] = result.value;
            } else {
                students.push(result.value);
            }
            renderStudents();
            renderAsistencias();
            Swal.fire('Guardado', 'Estudiante procesado con éxito', 'success');
        }
    });
}

function editStudent(dni) {
    const student = students.find(s => s.dni === dni);
    if (student) showStudentForm(student);
}

function deleteStudent(dni) {
    const student = students.find(s => s.dni === dni);
    Swal.fire({
        title: '¿Eliminar estudiante?',
        text: `¿Seguro que deseas eliminar a ${student.nombres} ${student.apellidos}? Se borrará todo su historial de asistencias.`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Sí, eliminar',
        cancelButtonText: 'Cancelar'
    }).then(result => {
        if (result.isConfirmed) {
            students = students.filter(s => s.dni !== dni);
            asistencias = asistencias.filter(a => a.dni !== dni);
            renderStudents();
            renderAsistencias();
            Swal.fire('Eliminado', 'Estudiante eliminado correctamente', 'success');
        }
    });
}

function showAsistenciaForm(asistencia = null, index = null) {
    const studentDnis = students.map(s => ({ value: s.dni, text: `${s.dni} - ${s.nombres} ${s.apellidos}` }));

    Swal.fire({
        title: asistencia ? 'Editar Asistencia' : 'Registrar Asistencia',
        html: `
            <div class="swal-form-flex">
                <div class="input-field">
                    <label for="asistenciaDni">Seleccionar Estudiante</label>
                    <select id="asistenciaDni">
                        <option value="">Seleccione un alumno...</option>
                        ${studentDnis.map(s => `<option value="${s.value}" ${asistencia?.dni === s.value ? 'selected' : ''}>${s.text}</option>`).join('')}
                    </select>
                </div>
                <div class="input-field">
                    <label for="fecha">Fecha</label>
                    <input id="fecha" type="date" value="${asistencia?.fecha || new Date().toISOString().split('T')[0]}">
                </div>
                <div class="input-field">
                    <label for="hora">Hora</label>
                    <input id="hora" type="time" value="${asistencia?.hora || new Date().toTimeString().split(':').slice(0, 2).join(':')}">
                </div>
                <div class="input-field">
                    <label for="estado">Estado</label>
                    <select id="estado">
                        <option value="Presente" ${asistencia?.estado === 'Presente' ? 'selected' : ''}>Presente</option>
                        <option value="Ausente" ${asistencia?.estado === 'Ausente' ? 'selected' : ''}>Ausente</option>
                        <option value="Tarde" ${asistencia?.estado === 'Tarde' ? 'selected' : ''}>Tarde</option>
                    </select>
                </div>
            </div>
        `,
        confirmButtonText: asistencia ? 'Actualizar' : 'Guardar',
        showCancelButton: true,
        cancelButtonText: 'Cancelar',
        customClass: {
            popup: 'swal2-custom-modal-popup'
        },
        preConfirm: () => {
            const dni = document.getElementById('asistenciaDni').value;
            const fecha = document.getElementById('fecha').value;
            const hora = document.getElementById('hora').value;
            const estado = document.getElementById('estado').value;

            if (!dni || !fecha || !hora || !estado) {
                Swal.showValidationMessage('Todos los campos son obligatorios');
                return null;
            }

            return { dni, fecha, hora, estado };
        }
    }).then(result => {
        if (result.isConfirmed) {
            if (asistencia && index !== null) {
                asistencias[index] = result.value;
            } else {
                asistencias.push(result.value);
            }
            renderAsistencias();
            Swal.fire('Guardado', 'Asistencia registrada con éxito', 'success');
        }
    });
}

function editAsistencia(index) {
    showAsistenciaForm(asistencias[index], index);
}

function deleteAsistencia(index) {
    Swal.fire({
        title: '¿Eliminar asistencia?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Sí, eliminar',
        cancelButtonText: 'Cancelar'
    }).then(result => {
        if (result.isConfirmed) {
            asistencias.splice(index, 1);
            renderAsistencias();
            Swal.fire('Eliminado', 'Asistencia eliminada correctamente', 'success');
        }
    });
}

function generateQR(dni) {
    Swal.fire({
        title: 'Código QR del Estudiante',
        html: `<div id="qr-container" style="display:flex;justify-content:center;align-items:center;padding:20px;"></div>`,
        showConfirmButton: false,
        showCloseButton: true
    });

    setTimeout(() => {
        const qrContainer = document.getElementById('qr-container');
        if (qrContainer) {
            QRCode.toCanvas(qrContainer, dni, {
                width: 210,
                height: 210,
                color: { dark: '#4361ee', light: '#ffffff' }
            });
        }
    }, 150);
}

function initQRScanner() {
    if (qrScanner) {
        qrScanner.clear();
        qrScanner = null;
    }

    Html5Qrcode.getCameras().then(devices => {
        const backCameras = devices ? devices.filter(d => d.label && d.label.toLowerCase().includes('back')) : [];
        const selectedCamera = backCameras.length > 0 ? backCameras[0].id : (devices && devices.length ? devices[0].id : null);
        
        if (selectedCamera) {
            qrScanner = new Html5Qrcode('qr-reader');
            qrScanner.start(selectedCamera, {
                fps: 12,
                qrbox: (width, height) => {
                    const minEdge = Math.min(width, height);
                    return { width: Math.floor(minEdge * 0.65), height: Math.floor(minEdge * 0.65) };
                }
            }, onScanSuccess, onScanError).catch(err => {
                console.error("No se pudo arrancar la cámara principal: ", err);
            });
        } else {
            Swal.fire('Error', 'No se detectó hardware de cámara activo.', 'error');
        }
    }).catch(err => {
        Swal.fire('Error', 'Permiso denegado de cámara: ' + err, 'error');
    });
}

function onScanSuccess(decodedText) {
    const student = students.find(s => s.dni === decodedText);
    
    if (student) {
        if (qrScanner) qrScanner.pause(true);

        const today = new Date().toISOString().split('T')[0];
        const now = new Date().toTimeString().split(':').slice(0, 2).join(':');

        const yaAsistio = asistencias.some(a => a.dni === decodedText && a.fecha === today);
        
        if(yaAsistio) {
            Swal.fire({
                title: 'Aviso de Asistencia',
                text: `${student.nombres} ya cuenta con asistencia hoy.`,
                icon: 'info'
            }).then(() => { if (qrScanner) qrScanner.resume(); });
            return;
        }

        asistencias.push({ dni: decodedText, fecha: today, hora: now, estado: 'Presente' });
        renderAsistencias();

        Swal.fire({
            title: '✅ Asistencia Registrada',
            html: `<p><strong>${student.nombres} ${student.apellidos}</strong></p>
                   <p>DNI: ${decodedText} | Hora: ${now}</p>`,
            icon: 'success',
            timer: 2000,
            showConfirmButton: false
        }).then(() => {
            if (qrScanner) qrScanner.resume();
        });
    } else {
        if (qrScanner) qrScanner.pause(true);
        Swal.fire('❌ Alumno No Encontrado', `El DNI ${decodedText} no pertenece a la base de datos de estudiantes.`, 'error')
            .then(() => { if (qrScanner) qrScanner.resume(); });
    }
}

// Silenciado para evitar saturaciones de logs en consola
function onScanError(error) {}

function showBackupModal() {
    Swal.fire({
        title: '💾 Gestión de Backup',
        html: `
            <div style="display:flex;flex-direction:column;gap:15px;padding:10px;">
                <button id="modalBtnExportarTodo" class="swal2-confirm swal2-styled" style="background:#5a67d8; margin:0; border-radius:10px;">📤 Exportar Todo</button>
                <button id="modalBtnExportarEstudiantes" class="swal2-confirm swal2-styled" style="background:#4dabf7; margin:0; border-radius:10px;">📤 Exportar Estudiantes</button>
                <button id="modalBtnExportarAsistencias" class="swal2-confirm swal2-styled" style="background:#4dabf7; margin:0; border-radius:10px;">📤 Exportar Asistencias</button>
                <hr style="margin:5px 0; border-color: #e9ecef;">
                <button id="modalBtnImportarBackup" class="swal2-confirm swal2-styled" style="background:#38a169; margin:0; border-radius:10px;">📥 Importar Backup JSON</button>
            </div>
        `,
        showCancelButton: true,
        cancelButtonText: 'Cerrar',
        showConfirmButton: false,
        didOpen: () => {
            document.getElementById('modalBtnExportarTodo').addEventListener('click', () => { Swal.close(); exportAll(); });
            document.getElementById('modalBtnExportarEstudiantes').addEventListener('click', () => { Swal.close(); exportStudents(); });
            document.getElementById('modalBtnExportarAsistencias').addEventListener('click', () => { Swal.close(); exportAsistencias(); });
            document.getElementById('modalBtnImportarBackup').addEventListener('click', () => { Swal.close(); importBackup(); });
        }
    });
}

function exportStudents() {
    if(students.length === 0) return Swal.fire('Atención', 'No hay estudiantes para exportar', 'warning');
    const dataStr = JSON.stringify(students, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `estudiantes_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
}

function exportAsistencias() {
    if(asistencias.length === 0) return Swal.fire('Atención', 'No hay asistencias para exportar', 'warning');
    const dataStr = JSON.stringify(asistencias, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `asistencias_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
}

function exportAll() {
    if(students.length === 0 && asistencias.length === 0) return Swal.fire('Atención', 'No hay datos guardados', 'warning');
    const backupData = { estudiantes: students, asistencias: asistencias, fecha: new Date().toISOString() };
    const dataStr = JSON.stringify(backupData, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup_completo_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    Swal.fire('Exportado', 'Copia de seguridad descargada', 'success');
}

function importBackup() {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.json';
    fileInput.style.display = 'none';
    document.body.appendChild(fileInput);

    fileInput.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const data = JSON.parse(event.target.result);

                if (data.estudiantes && data.asistencias) {
                    students = data.estudiantes;
                    asistencias = data.asistencias;
                } else if (Array.isArray(data)) {
                    students = data;
                } else if (data.estudiantes) {
                    students = data.estudiantes;
                } else if (data.asistencias) {
                    asistencias = data.asistencias;
                }

                renderStudents();
                renderAsistencias();
                Swal.fire('Importado', 'Los datos del JSON se cargaron con éxito', 'success');
            } catch (error) {
                Swal.fire('Error', 'Archivo JSON dañado o inválido', 'error');
            } finally {
                document.body.removeChild(fileInput);
            }
        };
        reader.readAsText(file);
    };
    fileInput.click();
}