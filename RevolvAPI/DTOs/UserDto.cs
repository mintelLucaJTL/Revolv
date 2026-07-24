namespace RevolvAPI.DTOs
{
    // Returned by GET/PATCH api/user/me. Name is nullable because users created
    // before this feature existed might not have set one yet.
    public class UserDto
    {
        public int Id { get; set; }
        public string Email { get; set; } = string.Empty;
        public string? Name { get; set; }
    }
}
