// Unity 없이 컴파일하기 위한 최소 대역 (테스트 전용, Unity 프로젝트에는 넣지 않는다)
namespace UnityEngine
{
    public static class Application { public static string streamingAssetsPath = "."; }
    public static class Debug { public static void LogWarning(object o) => System.Console.WriteLine(o); }
}
