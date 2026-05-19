pub fn format_id(n: u32) -> &'static str {
    // Em no_std sem alloc dinâmico, usamos um ID fixo baseado no contador
    // O ID real será gerado pelo backend e passado como parâmetro
    // Esta função é um placeholder para compatibilidade
    match n % 10 {
        0 => "BNPL-0000",
        1 => "BNPL-0001",
        2 => "BNPL-0002",
        3 => "BNPL-0003",
        4 => "BNPL-0004",
        5 => "BNPL-0005",
        6 => "BNPL-0006",
        7 => "BNPL-0007",
        8 => "BNPL-0008",
        _ => "BNPL-0009",
    }
}
