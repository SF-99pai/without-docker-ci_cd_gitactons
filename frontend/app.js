const { useState, useEffect } = React;
const API_URL = "http://127.0.0.1:8000"; // adjust if backend runs elsewhere

function EmployeeForm({ onAdded, employeeId }) {
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [department, setDepartment] = useState("");
    const [role, setRole] = useState("");
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        let mounted = true;
        async function loadEmployee() {
            if (!employeeId) return;
            setLoading(true);
            try {
                const res = await fetch(`${API_URL}/employees/${employeeId}`);
                if (!res.ok) throw new Error('Not found');
                const data = await res.json();
                if (!mounted) return;
                setName(data.name || '');
                setEmail(data.email || '');
                setDepartment(data.department || '');
                setRole(data.role || '');
            } catch (err) {
                alert('Failed to load employee for editing');
            } finally {
                if (mounted) setLoading(false);
            }
        }
        loadEmployee();
        return () => { mounted = false };
    }, [employeeId]);

    async function handleSubmit(e) {
        e.preventDefault();
        setLoading(true);
        const payload = { name, email, department, role };
        try {
            let res;
            if (employeeId) {
                res = await fetch(`${API_URL}/employees/${employeeId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                });
            } else {
                res = await fetch(`${API_URL}/employees`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                });
            }
            if (!res.ok) throw new Error('Failed to save');
            const result = await res.json();
            setName('');
            setEmail('');
            setDepartment('');
            setRole('');
            // pass created/updated employee back to parent so list can update immediately
            onAdded(result.employee || null);
        } catch (err) {
            alert("Error saving employee");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="form-container">
            <h2>{employeeId ? 'Edit Employee' : 'Add Employee'}</h2>
            <form onSubmit={handleSubmit}>
                <input value={name} onChange={e => setName(e.target.value)} placeholder="Name" required />
                <input value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" type="email" required />
                <input value={department} onChange={e => setDepartment(e.target.value)} placeholder="Department" required />
                <input value={role} onChange={e => setRole(e.target.value)} placeholder="Role" required />
                <button type="submit" disabled={loading}>{loading ? 'Saving...' : (employeeId ? 'Update Employee' : 'Add Employee')}</button>
            </form>
        </div>
    );
}

function EmployeeList({ refreshKey, addedEmployee }) {
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        let mounted = true;
        async function load() {
            setLoading(true);
            try {
                const res = await fetch(`${API_URL}/employees`);
                if (!res.ok) throw new Error('Failed to load');
                const data = await res.json();
                if (mounted) setEmployees(data);
            } catch (err) {
                console.error(err);
            } finally {
                if (mounted) setLoading(false);
            }
        }
        load();
        return () => { mounted = false };
    }, [refreshKey]);

    // when a new employee is added, optimistically prepend to list
    useEffect(() => {
        if (addedEmployee) {
            setEmployees(prev => {
                // avoid duplicate if already present
                if (prev.some(e => e.id === addedEmployee.id)) return prev;
                return [addedEmployee, ...prev];
            });
        }
    }, [addedEmployee]);

    return (
        <div className="table-container">
            <h2>Employees</h2>
            {loading ? <div>Loading...</div> : (
                <table>
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Name</th>
                            <th>Email</th>
                            <th>Department</th>
                            <th>Role</th>
                        </tr>
                    </thead>
                    <tbody>
                        {employees.map(emp => (
                            <tr key={emp.id} onDoubleClick={() => window.location.href = `form.html?id=${emp.id}`} style={{ cursor: 'pointer' }}>
                                <td>{emp.id}</td>
                                <td>{emp.name}</td>
                                <td>{emp.email}</td>
                                <td>{emp.department}</td>
                                <td>{emp.role}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    );
}

function App() {
    const [refreshKey, setRefreshKey] = useState(0);
    const [lastAdded, setLastAdded] = useState(null);

    // decide which page to render based on URL
    const isFormPage = window.location.pathname.endsWith('form.html');
    const urlParams = new URLSearchParams(window.location.search);
    const editingId = urlParams.get('id') ? Number(urlParams.get('id')) : null;

    function handleAdded(employee) {
        if (employee) setLastAdded(employee);
        // on any add, navigate back to index (if on form page)
        if (isFormPage) {
            window.location.href = 'index.html';
            return;
        }
        setRefreshKey(k => k + 1);
    }

    if (isFormPage) {
        return (
            <div className="container">
                <h1>{editingId ? 'Edit Employee' : 'Add Employee'}</h1>
                <EmployeeForm onAdded={handleAdded} employeeId={editingId} />
            </div>
        );
    }

    return (
        <div className="container">
            <h1>Employee Management</h1>
            <div style={{ marginBottom: 12 }}>
                <a href="form.html" className="btn">Add Employee</a>
            </div>
            <EmployeeList refreshKey={refreshKey} addedEmployee={lastAdded} />
        </div>
    );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);