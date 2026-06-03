// Array vacío para que puedas agregar tus propios estudiantes
const initialStudents = [];

let students = JSON.parse(localStorage.getItem('students')) || [...initialStudents];
let asistencias = JSON.parse(localStorage.getItem('asistencias')) || [];
let qrScanner = null;

// Inicializar
document.addEventListener('DOMContentLoaded', () => {
    renderStudents();
    renderAsistencias();
    setupEventListeners();
});

function setupEventListeners() {
    document.getElementById('btnAgregarEstudiante').addEventListener('click', showStudentForm);
    document.getElementById('btnAgregarAsistencia').addEventListener('click', showAsistenciaForm);
    document.getElementById('btnEstudiantes').addEventListener('click', () => switchSection('estudiantes'));
    document.getElementById('btnAsistencias').addEventListener('click', () => switchSection('asistencias'));
    document.getElementById('btnEscanearQR').addEventListener('click', () => switchSection('escanear'));
    document.getElementById('btnBackup').addEventListener('click', showBackupModal);
}

function switchSection(section) {
    document.querySelectorAll('nav button').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.section').forEach(sec => sec.classList.remove('active'));

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
    localStorage.setItem('students', JSON.stringify(students));
}

function renderAsistencias() {
    const tbody = document.getElementById('tbodyAsistencias');
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
    localStorage.setItem('asistencias', JSON.stringify(asistencias));
}

function showStudentForm(student = null) {
    let tempScanner = null;
    
    Swal.fire({
        title: student ? 'Editar Estudiante' : 'Agregar Estudiante',
        html: `
            <div style="display:flex;gap:10px;align-items:center;">
                <input id="dni" class="swal2-input" placeholder="DNI" value="${student?.dni || ''}" style="flex:1;">
                <button id="btnScanDni" class="swal2-styled" style="background:#4dabf7;padding:10px;">📷 Escanear DNI</button>
            </div>
            <input id="nombres" class="swal2-input" placeholder="Nombres" value="${student?.nombres || ''}">
            <input id="apellidos" class="swal2-input" placeholder="Apellidos" value="${student?.apellidos || ''}">
            <select id="genero" class="swal2-select">
                <option value="Masculino" ${student?.genero === 'Masculino' ? 'selected' : ''}>Masculino</option>
                <option value="Femenino" ${student?.genero === 'Femenino' ? 'selected' : ''}>Femenino</option>
            </select>
            <input id="telefono" class="swal2-input" placeholder="Teléfono" value="${student?.telefono || ''}">
            <input id="edad" class="swal2-input" placeholder="Edad" type="number" value="${student?.edad || ''}">
            <div id="scanner-container" style="margin-top:15px;display:none;">
                <div id="dni-scanner" style="width:100%;max-width:300px;margin:0 auto;"></div>
            </div>
        `,
        confirmButtonText: student ? 'Actualizar' : 'Guardar',
        focusConfirm: false,
        didOpen: () => {
            const btnScan = document.getElementById('btnScanDni');
            if (btnScan) {
                btnScan.addEventListener('click', () => {
                    document.getElementById('scanner-container').style.display = 'block';
                    btnScan.disabled = true;
                    
                    Html5Qrcode.getCameras().then(devices => {
                        const backCameras = devices ? devices.filter(d => d.label && d.label.toLowerCase().includes('back')) : [];
                        const selectedCamera = backCameras.length > 0 ? backCameras[0].id : (devices && devices.length ? devices[devices.length - 1].id : null);
                        
                        if (selectedCamera) {
                            tempScanner = new Html5Qrcode('dni-scanner');
                            tempScanner.start(selectedCamera, { fps: 10, qrbox: 200 }, 
                                (decodedText) => {
                                    tempScanner.stop().then(() => {
                                        document.getElementById('dni').value = decodedText;
                                        document.getElementById('scanner-container').style.display = 'none';
                                        btnScan.disabled = false;
                                    });
                                }
                            );
                        }
                    });
                });
            }
        },
        preConfirm: () => {
            const dni = document.getElementById('dni').value;
            const nombres = document.getElementById('nombres').value;
            const apellidos = document.getElementById('apellidos').value;
            const genero = document.getElementById('genero').value;
            const telefono = document.getElementById('telefono').value;
            const edad = document.getElementById('edad').value;

            if (!dni || !nombres || !apellidos || !genero || !telefono || !edad) {
                Swal.showValidationMessage('Todos los campos son obligatorios');
                return null;
            }

            return { dni, nombres, apellidos, genero, telefono, edad: parseInt(edad) };
        }
    }).then(result => {
        if (tempScanner) {
            tempScanner.stop().catch(() => {});
        }
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
            Swal.fire('Guardado', 'Estudiante guardado correctamente', 'success');
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
        text: `¿Seguro que deseas eliminar a ${student.nombres} ${student.apellidos}?`,
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
            <select id="asistenciaDni" class="swal2-select">
                <option value="">Seleccione un estudiante</option>
                ${studentDnis.map(s => `<option value="${s.value}" ${asistencia?.dni === s.value ? 'selected' : ''}>${s.text}</option>`).join('')}
            </select>
            <input id="fecha" class="swal2-input" type="date" value="${asistencia?.fecha || new Date().toISOString().split('T')[0]}">
            <input id="hora" class="swal2-input" type="time" value="${asistencia?.hora || new Date().toTimeString().split(':').slice(0, 2).join(':')}">
            <select id="estado" class="swal2-select">
                <option value="Presente" ${asistencia?.estado === 'Presente' ? 'selected' : ''}>Presente</option>
                <option value="Ausente" ${asistencia?.estado === 'Ausente' ? 'selected' : ''}>Ausente</option>
                <option value="Tarde" ${asistencia?.estado === 'Tarde' ? 'selected' : ''}>Tarde</option>
            </select>
        `,
        confirmButtonText: asistencia ? 'Actualizar' : 'Guardar',
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
            Swal.fire('Guardado', 'Asistencia guardada correctamente', 'success');
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
        title: 'Código QR del DNI',
        html: `<div id="qr-container" style="display:flex;justify-content:center;align-items:center;padding:20px;"></div>`,
        showConfirmButton: false,
        showCloseButton: true
    });

    setTimeout(() => {
        const qrContainer = document.getElementById('qr-container');
        QRCode.toCanvas(qrContainer, dni, {
            width: 200,
            height: 200,
            color: { dark: '#5a67d8', light: '#ffffff' }
        });
    }, 100);
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
                fps: 10,
                qrbox: 250
            }, onScanSuccess, onScanError);
        } else {
            Swal.fire('Error', 'No se detectó ninguna cámara', 'error');
        }
    }).catch(err => {
        Swal.fire('Error', 'No se pudo acceder a la cámara: ' + err, 'error');
    });
}

function onScanSuccess(decodedText) {
    if (qrScanner) {
        qrScanner.pause();
    }

    const student = students.find(s => s.dni === decodedText);
    if (student) {
        const today = new Date().toISOString().split('T')[0];
        const now = new Date().toTimeString().split(':').slice(0, 2).join(':');

        asistencias.push({
            dni: decodedText,
            fecha: today,
            hora: now,
            estado: 'Presente'
        });

        renderAsistencias();
        if (qrScanner) {
            qrScanner.clear().then(() => {
                qrScanner = null;
            });
        } else {
            qrScanner = null;
        }

        Swal.fire({
            title: '✅ Asistencia Registrada',
            html: `<p><strong>${student.nombres} ${student.apellidos}</strong></p>
                   <p>DNI: ${decodedText}</p>
                   <p>Fecha: ${today}</p>
                   <p>Hora: ${now}</p>`,
            icon: 'success',
            timer: 2000,
            showConfirmButton: false
        }).then(() => {
            switchSection('escanear');
        });
    } else {
        if (qrScanner) {
            qrScanner.clear().then(() => {
                qrScanner = null;
            });
        }
        Swal.fire('❌ Error', `No se encontró el estudiante con DNI: ${decodedText}. Agregue el estudiante primero.`, 'error');
    }
}

function onScanError(error) {
    console.warn('Error al escanear:', error);
}

function showBackupModal() {
    Swal.fire({
        title: '💾 Gestión de Backup',
        html: `
            <div style="display:flex;flex-direction:column;gap:15px;padding:20px;">
                <button id="btnExportarTodo" class="swal2-confirm swal2-styled" style="background:#5a67d8;">📤 Exportar Todo (Estudiantes + Asistencias)</button>
                <button id="btnExportarEstudiantes" class="swal2-confirm swal2-styled" style="background:#4dabf7;">📤 Exportar Solo Estudiantes</button>
                <button id="btnExportarAsistencias" class="swal2-confirm swal2-styled" style="background:#4dabf7;">📤 Exportar Solo Asistencias</button>
                <hr style="margin:10px 0;">
                <input type="file" id="fileInput" accept=".json" style="display:none;">
                <button id="btnImportarBackup" class="swal2-confirm swal2-styled" style="background:#38a169;">📥 Importar Backup</button>
            </div>
        `,
        showCancelButton: false,
        showConfirmButton: false
    });
}

function exportStudents() {
    const dataStr = JSON.stringify(students, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `estudiantes_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    Swal.fire('Exportado', `Se exportaron ${students.length} estudiantes`, 'success');
}

function exportAsistencias() {
    const dataStr = JSON.stringify(asistencias, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `asistencias_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    Swal.fire('Exportado', `Se exportaron ${asistencias.length} asistencias`, 'success');
}

function exportAll() {
    const backupData = {
        estudiantes: students,
        asistencias: asistencias,
        fecha: new Date().toISOString()
    };
    const dataStr = JSON.stringify(backupData, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup_completo_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    Swal.fire('Exportado', 'Backup completo exportado correctamente', 'success');
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
                localStorage.setItem('students', JSON.stringify(students));
                localStorage.setItem('asistencias', JSON.stringify(asistencias));

                document.body.removeChild(fileInput);
                Swal.fire('Importado', 'Backup importado correctamente', 'success');
            } catch (error) {
                document.body.removeChild(fileInput);
                Swal.fire('Error', 'Archivo JSON inválido', 'error');
            }
        };
        reader.readAsText(file);
    };
    fileInput.click();
}